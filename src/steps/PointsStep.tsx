import { useState } from 'react'
import { researchHelp, suggestPoints, type PointIdea, type ResearchHelp } from '../lib/coach'
import { useCoach } from '../lib/useCoach'
import { CoachBox, ErrorNote, Thinking } from '../components/ui'
import type { StepProps } from './types'

export function PointsStep({ draft, update }: StepProps) {
  const ideas = useCoach<PointIdea[]>()
  const [seen, setSeen] = useState<string[]>([])

  async function moreIdeas() {
    const result = await ideas.run(() => suggestPoints(draft, [...seen, ...draft.points.filter(Boolean)]))
    if (result) setSeen((s) => [...s, ...result.map((p) => p.label)])
  }

  function setPoint(i: number, value: string) {
    const points = [...draft.points]
    points[i] = value
    update({ points })
  }

  function pickPoint(label: string) {
    const empty = draft.points.findIndex((p) => !p.trim())
    if (empty !== -1) setPoint(empty, label)
  }

  const full = draft.points.every((p) => p.trim())

  return (
    <>
      <h2>Your three main points</h2>
      <p className="lead">Each point becomes one body paragraph. What are three reasons your thesis is true?</p>

      <ol className="points">
        {draft.points.map((p, i) => (
          <PointRow key={i} index={i} draft={draft} update={update} value={p} onChange={(v) => setPoint(i, v)} />
        ))}
      </ol>

      <div className="actions">
        <button type="button" onClick={moreIdeas} disabled={ideas.loading}>
          {ideas.data ? 'Give me 3 more ideas' : 'Suggest some points'}
        </button>
      </div>

      {ideas.loading && <Thinking label="Brainstorming points…" />}
      <ErrorNote message={ideas.error} />
      {ideas.data && !ideas.loading && (
        <CoachBox title="Point ideas">
          <p className="hint">Use one as a starting point, then put it in your own words.</p>
          <ul className="cards">
            {ideas.data.map((idea) => (
              <li key={idea.label} className="card">
                <strong>{idea.label}</strong>
                <span>{idea.why}</span>
                <button type="button" className="small" disabled={full} onClick={() => pickPoint(idea.label)}>
                  Use this
                </button>
              </li>
            ))}
          </ul>
        </CoachBox>
      )}
    </>
  )
}

type PointRowProps = StepProps & { index: number; value: string; onChange: (v: string) => void }

function PointRow({ draft, update, index, value, onChange }: PointRowProps) {
  const help = useCoach<ResearchHelp>()
  const [open, setOpen] = useState(false)

  function setNotes(v: string) {
    const notes = [...draft.notes]
    notes[index] = v
    update({ notes })
  }

  return (
    <li>
      <div className="point-row">
        <input
          aria-label={`Main point ${index + 1}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Point ${index + 1}`}
        />
        <button
          type="button"
          className="small"
          disabled={!value.trim() || help.loading}
          onClick={() => {
            setOpen(true)
            help.run(() => researchHelp(draft, value))
          }}
        >
          I don't know much about this
        </button>
      </div>

      {help.loading && <Thinking label="Putting together a research plan…" />}
      <ErrorNote message={help.error} />
      {open && help.data && !help.loading && (
        <CoachBox title="Research plan">
          <p className="hint warn">⚠️ Background from Gemma's memory. It can be wrong, so check it before you use it.</p>
          <ul>
            {help.data.background.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="hint">Try searching for:</p>
          <ul className="searches">
            {help.data.searches.map((s) => (
              <li key={s}>
                <code>{s}</code>
              </li>
            ))}
          </ul>
          <p className="hint">Evidence to look for:</p>
          <ul>
            {help.data.lookFor.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </CoachBox>
      )}

      {(open || draft.notes[index]) && (
        <label className="field">
          <span>Your research notes for this point</span>
          <textarea
            rows={3}
            value={draft.notes[index]}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste facts, quotes and where you found them. You'll see these when you write this paragraph."
          />
        </label>
      )}
    </li>
  )
}
