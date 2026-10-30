import { useState } from 'react'
import {
  exampleParagraph,
  paragraphFeedback,
  reviseParagraph,
  type ExampleParagraph,
  type ParagraphFeedback,
  type Revision,
} from '../lib/coach'
import { wordCount, type SectionSpec } from '../lib/essay'
import { useCoach } from '../lib/useCoach'
import { CoachBox, DictationTip, ErrorNote, Thinking } from '../components/ui'
import { ChunkBuilder } from '../components/ChunkBuilder'
import { Authored } from '../components/Authored'
import type { StepProps } from './types'

const STATUS_ICON = { done: '✅', weak: '🟡', missing: '⭕' } as const

type Props = StepProps & { spec: SectionSpec; notes?: string; point?: string }

export function SectionStep({ draft, update, spec, notes, point }: Props) {
  const feedback = useCoach<ParagraphFeedback>()
  const example = useCoach<ExampleParagraph>()
  const revision = useCoach<Revision>()
  const [reply, setReply] = useState('')
  const [revised, setRevised] = useState(false)
  const text = draft.sections[spec.id] ?? ''
  const progress = draft.chunkProgress[spec.id] ?? 0
  const chunk = spec.chunks[progress]

  function setText(value: string) {
    update({ sections: { ...draft.sections, [spec.id]: value } })
  }

  // Add an accepted chunk to the end of the paragraph and move on to the next chunk.
  function acceptChunk(sentences: string) {
    let added = sentences.trim()
    if (chunk?.appendThesis && draft.thesis.trim()) added += ` ${draft.thesis.trim()}`
    update({
      sections: { ...draft.sections, [spec.id]: [text.trim(), added].filter(Boolean).join(' ') },
      chunkProgress: { ...draft.chunkProgress, [spec.id]: progress + 1 },
    })
  }

  function getFeedback() {
    setRevised(false)
    revision.setData(null)
    feedback.run(() => paragraphFeedback(draft, spec, text))
  }

  function revise() {
    if (!feedback.data) return
    const fb = feedback.data
    revision.run(() => reviseParagraph(draft, spec, text, fb, reply, notes))
  }

  // Swap in the revised paragraph and clear the old feedback so the student can check again.
  function applyRevision() {
    if (!revision.data) return
    setText(revision.data.text)
    revision.setData(null)
    feedback.setData(null)
    setReply('')
    setRevised(true)
  }

  function rebuild() {
    if (confirm(`Clear this ${spec.title.toLowerCase()} and build it again with the coach?`)) {
      update({
        sections: { ...draft.sections, [spec.id]: '' },
        chunkProgress: { ...draft.chunkProgress, [spec.id]: 0 },
      })
    }
  }

  return (
    <>
      <h2>{spec.title}</h2>
      <p className="lead">{spec.goal}</p>

      {spec.chunks.length > 1 && (
        <ol className="chunk-steps" aria-label="Parts of this paragraph">
          {spec.chunks.map((c, i) => (
            <li key={c.id} className={i < progress ? 'done' : i === progress ? 'active' : ''}>
              {i < progress ? '✓ ' : ''}
              {c.label}
            </li>
          ))}
        </ol>
      )}


      {chunk ? (
        <ChunkBuilder
          key={`${spec.id}-${chunk.id}`}
          draft={draft}
          spec={spec}
          chunk={chunk}
          step={progress}
          total={spec.chunks.length}
          soFar={text}
          notes={notes}
          point={point}
          onAccept={acceptChunk}
        />
      ) : (
        <p className="all-done">
          ✓ All parts are in. Read your whole paragraph below, fix anything that doesn't sound like you, then get feedback.{' '}
          <button type="button" className="link" onClick={rebuild}>
            Rebuild with the coach
          </button>
        </p>
      )}

      <label className="field">
        <span>
          Your {spec.title.toLowerCase()} so far <em className="count">{wordCount(text)} words</em>
        </span>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sentences you accept will show up here. You can edit them anytime."
        />
      </label>
      <DictationTip />

      <div className="actions">
        <button type="button" onClick={() => example.run(() => exampleParagraph(draft, spec))} disabled={example.loading}>
          Show me an example (different topic)
        </button>
        <button
          type="button"
          className="primary"
          onClick={getFeedback}
          disabled={feedback.loading || wordCount(text) < 5}
        >
          {revised ? 'Get feedback again' : 'Get feedback'}
        </button>
      </div>
      {revised && <p className="hint">✓ Updated with your changes. Get feedback again to see how it improved.</p>}

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
          <label className="field reply">
            <span>Respond to the feedback in your own words</span>
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="e.g. My proof is that our class average went up after the phone basket rule"
            />
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={revise} disabled={!reply.trim() || revision.loading}>
              Update my paragraph
            </button>
          </div>
        </CoachBox>
      )}

      {revision.loading && <Thinking label="Updating your paragraph…" />}
      <ErrorNote message={revision.error} />
      {revision.data && !revision.loading && (
        <CoachBox title="Updated paragraph">
          <Authored text={revision.data.text} sources={[text, reply, notes ?? '', draft.thesis, ...draft.points]} />
          <p className="hint">What changed:</p>
          <ul>
            {revision.data.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="ask">Read it. Does this say what you meant?</p>
          <div className="actions">
            <button type="button" className="primary" onClick={applyRevision}>
              Use this version
            </button>
            <button type="button" onClick={() => revision.setData(null)}>
              Keep mine
            </button>
          </div>
        </CoachBox>
      )}
    </>
  )
}
