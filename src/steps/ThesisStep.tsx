import { useState } from 'react'
import { checkThesis, suggestAngles, type Angle, type ThesisCheck } from '../lib/coach'
import { useCoach } from '../lib/useCoach'
import { CoachBox, DictationTip, ErrorNote, Thinking } from '../components/ui'
import type { StepProps } from './types'

const VERDICT_LABEL: Record<ThesisCheck['verdict'], string> = {
  strong: '💪 Strong thesis',
  almost: '👍 Almost there',
  'needs work': '🛠️ Needs some work',
}

export function ThesisStep({ draft, update }: StepProps) {
  const angles = useCoach<Angle[]>()
  const check = useCoach<ThesisCheck>()
  const [seen, setSeen] = useState<string[]>([])

  async function moreAngles() {
    const result = await angles.run(() => suggestAngles(draft, seen))
    if (result) setSeen((s) => [...s, ...result.map((a) => a.title)])
  }

  return (
    <>
      <h2>Your thesis</h2>
      <p className="lead">
        One sentence that says what you believe and what you'll prove. It doesn't have to be perfect yet.
      </p>

      <label className="field">
        <span>Thesis</span>
        <textarea
          rows={3}
          value={draft.thesis}
          onChange={(e) => {
            update({ thesis: e.target.value })
            check.setData(null)
          }}
          placeholder="I believe… because…"
        />
      </label>
      <DictationTip />

      <div className="actions">
        <button type="button" onClick={moreAngles} disabled={angles.loading}>
          {angles.data ? 'Show me 3 more angles' : "I'm stuck, give me some angles"}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => check.run(() => checkThesis(draft))}
          disabled={check.loading || !draft.thesis.trim()}
        >
          Check my thesis
        </button>
      </div>

      {angles.loading && <Thinking label="Finding angles…" />}
      <ErrorNote message={angles.error} />
      {angles.data && !angles.loading && (
        <CoachBox title="Angles to consider">
          <p className="hint">Pick one that feels true to you, then answer its question in your own words.</p>
          <ul className="cards">
            {angles.data.map((a) => (
              <li key={a.title} className="card">
                <strong>{a.title}</strong>
                <span>{a.question}</span>
              </li>
            ))}
          </ul>
        </CoachBox>
      )}

      {check.loading && <Thinking label="Reading your thesis…" />}
      <ErrorNote message={check.error} />
      {check.data && !check.loading && (
        <CoachBox title={VERDICT_LABEL[check.data.verdict]}>
          {check.data.strengths.length > 0 && (
            <ul className="good">
              {check.data.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {check.data.questions.length > 0 && (
            <>
              <p className="hint">Questions to make it stronger:</p>
              <ul className="questions">
                {check.data.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </CoachBox>
      )}
    </>
  )
}
