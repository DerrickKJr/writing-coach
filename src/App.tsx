import { useEffect, useState, type ReactNode } from 'react'
import { CONCLUSION, EMPTY_DRAFT, INTRO, bodySpec, type Draft } from './lib/essay'
import { MODEL, warmUp } from './lib/ollama'
import { SetupStep } from './steps/SetupStep'
import { ThesisStep } from './steps/ThesisStep'
import { PointsStep } from './steps/PointsStep'
import { SectionStep } from './steps/SectionStep'
import { ReviewStep } from './steps/ReviewStep'
import type { StepProps } from './steps/types'

const STORAGE_KEY = 'writing-coach:draft'

type Step = {
  id: string
  label: string
  ready: (d: Draft) => boolean // can the student move past this step?
  render: (p: StepProps) => ReactNode
}

const STEPS: Step[] = [
  { id: 'setup', label: 'Assignment', ready: (d) => d.assignment.trim().length > 0, render: (p) => <SetupStep {...p} /> },
  { id: 'thesis', label: 'Thesis', ready: (d) => d.thesis.trim().length > 0, render: (p) => <ThesisStep {...p} /> },
  { id: 'points', label: 'Main points', ready: (d) => d.points.every((x) => x.trim()), render: (p) => <PointsStep {...p} /> },
  ...[0, 1, 2].map(
    (i): Step => ({
      id: `body-${i}`,
      label: `Body ${i + 1}`,
      ready: (d) => Boolean(d.sections[`body-${i}`]?.trim()),
      render: (p) => <SectionStep key={i} {...p} spec={bodySpec(i, p.draft.points[i])} notes={p.draft.notes[i]} point={p.draft.points[i]} />,
    }),
  ),
  { id: 'intro', label: 'Introduction', ready: (d) => Boolean(d.sections.intro?.trim()), render: (p) => <SectionStep key="intro" {...p} spec={INTRO} /> },
  { id: 'conclusion', label: 'Conclusion', ready: (d) => Boolean(d.sections.conclusion?.trim()), render: (p) => <SectionStep key="conclusion" {...p} spec={CONCLUSION} /> },
  { id: 'review', label: 'Review', ready: () => true, render: (p) => <ReviewStep {...p} /> },
]

function loadDraft(): { draft: Draft; step: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.draft) return { draft: { ...EMPTY_DRAFT, ...saved.draft }, step: saved.step ?? 0 }
  } catch {
    // Storage blocked or corrupted: start fresh.
  }
  return { draft: EMPTY_DRAFT, step: 0 }
}

export default function App() {
  const [initial] = useState(loadDraft)
  const [draft, setDraft] = useState<Draft>(initial.draft)
  const [step, setStep] = useState(initial.step)
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'offline'>('loading')

  useEffect(() => {
    warmUp()
      .then(() => setModelStatus('ready'))
      .catch(() => setModelStatus('offline'))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, step }))
    } catch {
      // Not fatal: the draft just won't survive a refresh.
    }
  }, [draft, step])

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  // A step is reachable once every step before it is ready.
  const reachable = (i: number) => STEPS.slice(0, i).every((s) => s.ready(draft))
  const current = STEPS[step]

  function startOver() {
    if (confirm('Start a new essay? Your current draft will be cleared.')) {
      setDraft(EMPTY_DRAFT)
      setStep(0)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          Writing Coach <span className="badge">Essay · Quick</span>
        </h1>
        <p className={`model ${modelStatus}`} role="status">
          {modelStatus === 'loading' && <>Waking up Gemma… the first load can take a few minutes</>}
          {modelStatus === 'ready' && (
            <>
              Gemma is ready · running locally on <code>{MODEL}</code>
            </>
          )}
          {modelStatus === 'offline' && <>Can't reach Gemma. Start Ollama with <code>ollama serve</code>, then refresh.</>}
        </p>
      </header>

      <nav className="steps" aria-label="Essay steps">
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={i === step ? 'active' : s.ready(draft) ? 'done' : ''}
                aria-current={i === step ? 'step' : undefined}
                disabled={!reachable(i)}
                onClick={() => setStep(i)}
              >
                <span className="num">{s.ready(draft) && i !== step && s.id !== 'review' ? '✓' : i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="link" onClick={startOver}>
          Start a new essay
        </button>
      </nav>

      <main className="content">
        {current.render({ draft, update })}

        <footer className="nav-buttons">
          <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0}>
            ← Back
          </button>
          {step < STEPS.length - 1 && (
            <button type="button" className="primary" onClick={() => setStep(step + 1)} disabled={!current.ready(draft)}>
              Next: {STEPS[step + 1].label} →
            </button>
          )}
        </footer>
      </main>
    </div>
  )
}
