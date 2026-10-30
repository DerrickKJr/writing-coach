import { paragraphFeedback, exampleParagraph, type ExampleParagraph, type ParagraphFeedback } from '../lib/coach'
import { wordCount, type SectionSpec } from '../lib/essay'
import { useCoach } from '../lib/useCoach'
import { CoachBox, DictationTip, ErrorNote, Thinking } from '../components/ui'
import type { StepProps } from './types'

const STATUS_ICON = { done: '✅', weak: '🟡', missing: '⭕' } as const

type Props = StepProps & { spec: SectionSpec; notes?: string }

export function SectionStep({ draft, update, spec, notes }: Props) {
  const feedback = useCoach<ParagraphFeedback>()
  const example = useCoach<ExampleParagraph>()
  const text = draft.sections[spec.id] ?? ''

  function setText(value: string) {
    update({ sections: { ...draft.sections, [spec.id]: value } })
  }

  return (
    <>
      <h2>{spec.title}</h2>
      <p className="lead">{spec.goal}</p>

      <ol className="guide">
        {spec.parts.map((p) => (
          <li key={p.id}>
            <strong>{p.label}:</strong> {p.question}
          </li>
        ))}
      </ol>

      {notes?.trim() && (
        <details className="notes" open>
          <summary>Your research notes</summary>
          <p>{notes}</p>
        </details>
      )}

      <label className="field">
        <span>
          Your {spec.title.toLowerCase()} <em className="count">{wordCount(text)} words</em>
        </span>
        <textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <DictationTip />

      <div className="actions">
        <button type="button" onClick={() => example.run(() => exampleParagraph(draft, spec))} disabled={example.loading}>
          Show me an example (different topic)
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => feedback.run(() => paragraphFeedback(draft, spec, text))}
          disabled={feedback.loading || wordCount(text) < 5}
        >
          Get feedback
        </button>
      </div>

      {example.loading && <Thinking label="Writing an example on another topic…" />}
      <ErrorNote message={example.error} />
      {example.data && !example.loading && (
        <CoachBox title={`Example: “${example.data.topic}”`}>
          <p className="hint">Notice how each sentence has a job. Now do the same for your topic.</p>
          <ul className="example">
            {example.data.sentences.map((s, i) => (
              <li key={i}>
                <span className="tag">{s.part}</span> {s.text}
              </li>
            ))}
          </ul>
        </CoachBox>
      )}

      {feedback.loading && <Thinking label="Reading your paragraph…" />}
      <ErrorNote message={feedback.error} />
      {feedback.data && !feedback.loading && (
        <CoachBox title="Feedback">
          <ul className="checklist">
            {feedback.data.parts.map((p) => (
              <li key={p.part}>
                <span aria-label={p.status}>{STATUS_ICON[p.status]}</span> <strong>{p.part}</strong>: {p.note}
              </li>
            ))}
          </ul>
          {feedback.data.strengths.length > 0 && (
            <ul className="good">
              {feedback.data.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <p className="hint">Next steps:</p>
          <ul className="questions">
            {feedback.data.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </CoachBox>
      )}
    </>
  )
}
