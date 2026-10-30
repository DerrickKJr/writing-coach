import { useState } from 'react'
import {
  checkThesis,
  combineThesis,
  suggestAngles,
  type Angle,
  type CombinedThesis,
  type ThesisCheck,
} from '../lib/coach'
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
  const combined = useCoach<CombinedThesis>()
  const [seen, setSeen] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])

  async function moreAngles() {
    const result = await angles.run(() => suggestAngles(draft, seen))
    if (result) setSeen((s) => [...s, ...result.map((a) => a.title)])
  }

  async function runCheck() {
    combined.setData(null)
    const result = await check.run(() => checkThesis(draft))
    if (result) setAnswers(result.questions.map(() => ''))
  }

  function setAnswer(i: number, value: string) {
    setAnswers((a) => a.map((x, j) => (j === i ? value : x)))
    combined.setData(null)
  }

  function combine() {
    if (!check.data) return
    const qa = check.data.questions.map((question, i) => ({ question, answer: answers[i] ?? '' }))
    combined.run(() => combineThesis(draft, qa))
  }

  function acceptCombined() {
    if (!combined.data) return
    update({ thesis: combined.data.thesis })
    combined.setData(null)
    check.setData(null)
  }

  const hasAnswers = answers.some((a) => a.trim())

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
            combined.setData(null)
          }}
          placeholder="I believe… because…"
        />
      </label>
      <DictationTip />

      <div className="actions">
        <button type="button" onClick={moreAngles} disabled={angles.loading}>
          {angles.data ? 'Show me 3 more angles' : "I'm stuck, give me some angles"}
        </button>
        <button type="button" className="primary" onClick={runCheck} disabled={check.loading || !draft.thesis.trim()}>
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
              <p className="hint">
                Answer any of these in your own words. You don't need full sentences. I'll fold your answers into your
                thesis, or you can edit the thesis box above yourself.
              </p>
              <ol className="answers">
                {check.data.questions.map((q, i) => (
                  <li key={q}>
                    <label className="field">
                      <span>{q}</span>
                      <textarea rows={2} value={answers[i] ?? ''} onChange={(e) => setAnswer(i, e.target.value)} />
                    </label>
                  </li>
                ))}
              </ol>
              <div className="actions">
                <button type="button" className="primary" onClick={combine} disabled={!hasAnswers || combined.loading}>
                  Put my answers into my thesis
                </button>
              </div>
            </>
          )}
        </CoachBox>
      )}

      {combined.loading && <Thinking label="Combining your answers…" />}
      <ErrorNote message={combined.error} />
      {combined.data && !combined.loading && (
        <CoachBox title="Your revised thesis">
          <blockquote className="revised">{combined.data.thesis}</blockquote>
          <p className="hint">Built only from your thesis and your answers. What changed:</p>
          <ul>
            {combined.data.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="actions">
            <button type="button" className="primary" onClick={acceptCombined}>
              Use this as my thesis
            </button>
            <button type="button" onClick={() => combined.setData(null)}>
              Keep mine
            </button>
          </div>
          <p className="hint">After you use it, tweak anything that doesn't sound like you, then check it again.</p>
        </CoachBox>
      )}
    </>
  )
}
