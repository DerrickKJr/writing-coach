import { useState } from 'react'
import { draftChunk, type ChunkAnswer, type ChunkDraft } from '../lib/coach'
import { attribute } from '../lib/authorship'
import type { Chunk, Draft, SectionSpec } from '../lib/essay'
import { useCoach } from '../lib/useCoach'
import { CoachBox, ErrorNote, Thinking } from './ui'

type Props = {
  draft: Draft
  spec: SectionSpec
  chunk: Chunk
  step: number
  total: number
  soFar: string
  notes?: string
  onAccept: (text: string) => void
}

// One chunk of a paragraph: the student answers, Gemma drafts 2-3 sentences from those
// answers, and the student confirms it says what they meant before it goes in.
export function ChunkBuilder({ draft, spec, chunk, step, total, soFar, notes, onAccept }: Props) {
  const result = useCoach<ChunkDraft>()
  const [answers, setAnswers] = useState<string[]>(chunk.questions.map(() => ''))
  const [followUps, setFollowUps] = useState<ChunkAnswer[]>([])
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [fixing, setFixing] = useState(false)
  const [fix, setFix] = useState('')

  const allAnswers: ChunkAnswer[] = [...chunk.questions.map((question, i) => ({ question, answer: answers[i] })), ...followUps]
  const ready = answers.every((a) => a.trim())
  const pending = result.data?.needMore ? result.data.followUp : null
  const drafted = result.data && !result.data.needMore ? result.data.text : null

  function run(extra: ChunkAnswer[] = [], redo?: { previous: string; fix: string }) {
    setFixing(false)
    return result.run(() =>
      draftChunk(draft, { spec, chunk, answers: [...allAnswers, ...extra], soFar, notes, ...redo }),
    )
  }

  function answerFollowUp() {
    if (!pending) return
    const extra = { question: pending, answer: followUpAnswer }
    setFollowUps((f) => [...f, extra])
    setFollowUpAnswer('')
    run([extra])
  }

  function redraft() {
    if (!drafted) return
    run([], { previous: drafted, fix })
    setFix('')
  }

  function writeMyself() {
    onAccept(allAnswers.map((a) => a.answer.trim()).filter(Boolean).join(' '))
  }

  // Everything the student typed themselves counts as "their words".
  const sources = [...allAnswers.map((a) => a.answer), notes ?? '', fix, draft.thesis, ...draft.points]
  const authorship = drafted ? attribute(drafted, sources) : null

  return (
    <CoachBox title={`Part ${step + 1} of ${total}: ${chunk.label}`}>
      <p className="hint">Short answers are fine. I'll turn them into sentences using only your ideas.</p>
      <ol className="answers">
        {chunk.questions.map((q, i) => (
          <li key={q}>
            <label className="field">
              <span>{q}</span>
              <textarea
                rows={2}
                value={answers[i]}
                onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
              />
            </label>
          </li>
        ))}
        {followUps.map((f) => (
          <li key={f.question}>
            <span className="answered-q">{f.question}</span>
            <span className="answered-a">{f.answer}</span>
          </li>
        ))}
      </ol>

      {!pending && !drafted && (
        <div className="actions">
          <button type="button" className="primary" onClick={() => run()} disabled={!ready || result.loading}>
            Turn my answers into sentences
          </button>
        </div>
      )}

      {result.loading && <Thinking label="Drafting from your answers…" />}
      <ErrorNote message={result.error} />

      {pending && !result.loading && (
        <div className="follow-up">
          <label className="field">
            <span>🤔 I need a bit more before I can write this: {pending}</span>
            <textarea rows={2} value={followUpAnswer} onChange={(e) => setFollowUpAnswer(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" className="primary" onClick={answerFollowUp} disabled={!followUpAnswer.trim()}>
              Try again
            </button>
          </div>
        </div>
      )}

      {drafted && authorship && !result.loading && (
        <div className="drafted">
          <p className="chunk-text">
            {authorship.tokens.map((t, i) => (t.yours ? <mark key={i}>{t.text}</mark> : <span key={i}>{t.text}</span>))}
          </p>
          <div className="meter" aria-label={`${authorship.percent}% of the key words are yours`}>
            <div className="meter-bar">
              <div className="meter-fill" style={{ width: `${authorship.percent}%` }} />
            </div>
            <span>
              <strong>{authorship.percent}%</strong> your words <span className="hint">(highlighted)</span>
            </span>
          </div>

          {!fixing ? (
            <>
              <p className="ask">Read it. Does this say what you meant?</p>
              <div className="actions">
                <button type="button" className="primary" onClick={() => onAccept(drafted)}>
                  Yes, add it
                </button>
                <button type="button" onClick={() => setFixing(true)}>
                  Not quite
                </button>
                <button type="button" onClick={writeMyself}>
                  I'll write it myself
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span>What's off? Say it your way.</span>
                <textarea rows={2} value={fix} onChange={(e) => setFix(e.target.value)} autoFocus />
              </label>
              <div className="actions">
                <button type="button" className="primary" onClick={redraft} disabled={!fix.trim()}>
                  Redraft
                </button>
                <button type="button" onClick={() => setFixing(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </CoachBox>
  )
}
