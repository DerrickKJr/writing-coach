import { useState } from 'react'
import { reviewEssay, type Review } from '../lib/coach'
import { assemble, wordCount } from '../lib/essay'
import { useCoach } from '../lib/useCoach'
import { CoachBox, ErrorNote, Thinking } from '../components/ui'
import type { StepProps } from './types'

export function ReviewStep({ draft }: StepProps) {
  const review = useCoach<Review>()
  const [copied, setCopied] = useState(false)
  const essay = assemble(draft)

  async function copy() {
    await navigator.clipboard.writeText(essay)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <h2>Your essay</h2>
      <p className="lead">
        You wrote all {wordCount(essay)} words of this. Get a final review, then fix what matters most.
      </p>

      <article className="essay">
        {essay ? essay.split('\n\n').map((p, i) => <p key={i}>{p}</p>) : <p className="hint">Nothing written yet.</p>}
      </article>

      <div className="actions">
        <button type="button" onClick={copy} disabled={!essay}>
          {copied ? 'Copied!' : 'Copy essay'}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => review.run(() => reviewEssay(draft, essay))}
          disabled={review.loading || wordCount(essay) < 30}
        >
          Review my whole essay
        </button>
      </div>

      {review.loading && <Thinking label="Reading your whole essay…" />}
      <ErrorNote message={review.error} />
      {review.data && !review.loading && (
        <CoachBox title="Final review">
          <p>{review.data.overall}</p>
          <table className="rubric">
            <tbody>
              {review.data.rubric.map((r) => (
                <tr key={r.criterion}>
                  <th scope="row">{r.criterion}</th>
                  <td className="score" aria-label={`${r.score} out of 4`}>
                    {'●'.repeat(r.score)}
                    <span className="empty">{'●'.repeat(4 - r.score)}</span>
                  </td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="good">
            {review.data.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="hint">Fix these first:</p>
          <ol className="questions">
            {review.data.priorities.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </CoachBox>
      )}
    </>
  )
}
