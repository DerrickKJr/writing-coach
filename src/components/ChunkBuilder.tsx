import { useState } from 'react'
import { GAP_MARKER, draftChunk, type ChunkAnswer, type ChunkDraft } from '../lib/coach'
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
  point?: string
  onAccept: (text: string) => void
}

// One chunk of a paragraph: the student answers a few short questions, Gemma drafts it from
// those answers, and the student confirms it says what they meant before it goes in.
export function ChunkBuilder({ draft, spec, chunk, step, total, soFar, notes, point, onAccept }: Props) {
  const result = useCoach<ChunkDraft>()
  const [answers, setAnswers] = useState<string[]>(
    chunk.questions.map((q) => (q.prefill === 'point' ? point : q.prefill === 'notes' ? notes : '') ?? ''),
  )
  const [followUps, setFollowUps] = useState<ChunkAnswer[]>([])
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [fixing, setFixing] = useState(false)
  const [fix, setFix] = useState('')

  const allAnswers: ChunkAnswer[] = [
    ...chunk.questions.map((q, i) => ({ question: q.text, answer: answers[i] })),
    ...followUps,
  ]
  // Proof can be left blank: Gemma will ask for it, or the student can write it anyway.
  const ready = chunk.questions.every((q, i) => q.prefill === 'notes' || answers[i].trim())
  const pending = result.data?.needMore ? result.data.followUp : null
  const drafted = result.data && !result.data.needMore ? result.data.text : null

  type RunOptions = { extra?: ChunkAnswer[]; previous?: string; fix?: string; allowGaps?: boolean }

  function run({ extra = [], ...rest }: RunOptions = {}) {
    setFixing(false)
    return result.run(() => draftChunk(draft, { spec, chunk, answers: [...allAnswers, ...extra], soFar, notes, ...rest }))
  }

  function answerFollowUp() {
    if (!pending) return
    const extra = { question: pending, answer: followUpAnswer }
    setFollowUps((f) => [...f, extra])
    setFollowUpAnswer('')
    run({ extra: [extra] })
  }

  function redraft() {
    if (!drafted) return
    run({ previous: drafted, fix })
    setFix('')
  }

  function writeMyself() {
    onAccept(allAnswers.map((a) => a.answer.trim()).filter(Boolean).join(' '))
  }

  // Everything the student typed themselves counts as "their words".
  const sources = [...allAnswers.map((a) => a.answer), notes ?? '', fix, draft.thesis, ...draft.points]
  const authorship = drafted ? attribute(drafted, sources) : null

  // Tokens inside [add your evidence here] get their own style so the gap is obvious.
  let inGap = false
  const rendered = authorship?.tokens.map((t, i) => {
    const gap = inGap || t.text.includes('[')
    inGap = gap && !t.text.includes(']')
    if (gap) return <span key={i} className="gap">{t.text}</span>
    return t.yours ? <mark key={i}>{t.text}</mark> : <span key={i}>{t.text}</span>
  })

  return (
    <CoachBox title={total > 1 ? `Part ${step + 1} of ${total}: ${chunk.label}` : chunk.label}>
      <p className="hint">Short answers are fine. I'll write it using only your ideas.</p>
      <ol className="answers">
        {chunk.questions.map((q, i) => (
          <li key={q.text}>
            <label className="field">
              <span>{q.text}</span>
              <textarea
                rows={q.prefill === 'notes' ? 3 : 2}
                placeholder={q.placeholder}
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
            {chunk.button}
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
            <button type="button" onClick={() => run({ allowGaps: true })}>
              Write it anyway
            </button>
          </div>
        </div>
      )}

      {drafted && authorship && !result.loading && (
        <div className="drafted">
          <p className="chunk-text">{rendered}</p>
          {drafted.includes(GAP_MARKER) && (
            <p className="hint warn">Fill in the highlighted gap with real evidence before you hand this in.</p>
          )}
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
