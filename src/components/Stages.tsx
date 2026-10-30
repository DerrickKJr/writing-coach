import { useState } from 'react'
import { wordCount, type Draft } from '../lib/essay'
import { readSource, type Source } from '../lib/sources'
import { ErrorNote } from './ui'

type StageInfo = { tag: string; sub: string; quote?: string; section?: string }

// What each stage card says about the student's progress so far.
function info(id: string, d: Draft): StageInfo {
  if (id === 'setup') {
    return { tag: 'Prompt', quote: d.assignment, sub: `${d.essayType} · ${d.grade}` }
  }
  if (id === 'thesis')
    return { tag: d.thesis ? `${wordCount(d.thesis)} words` : 'Claim', sub: d.thesis || 'One sentence you can defend' }
  if (id === 'points') {
    const filled = d.points.filter((p) => p.trim())
    return { tag: `${filled.length}/3`, sub: filled.length ? filled.join(' · ') : 'Three reasons it’s true' }
  }
  if (id.startsWith('body-')) {
    const i = Number(id.slice(5))
    return { tag: 'Body', sub: d.points[i] || 'Your point', section: id }
  }
  if (id === 'intro') return { tag: 'Framing', sub: 'Hook & background', section: id }
  if (id === 'conclusion') return { tag: 'Framing', sub: 'Wrap-up & so what', section: id }
  return { tag: 'Final', sub: 'Full essay + rubric feedback' }
}

const GROUPS = [
  { title: 'Foundation', ids: ['setup', 'thesis', 'points'] },
  { title: 'Argument body', ids: ['body-0', 'body-1', 'body-2'] },
  { title: 'Framing', ids: ['intro', 'conclusion'] },
  { title: 'Synthesis', ids: ['review'] },
]

type Props = {
  steps: { id: string; label: string; ready: (d: Draft) => boolean }[]
  current: number
  draft: Draft
  reachable: (i: number) => boolean
  onSelect: (i: number) => void
  onNewEssay: () => void
  update: (patch: Partial<Draft>) => void
}

export function Stages({ steps, current, draft, reachable, onSelect, onNewEssay, update }: Props) {
  return (
    <nav className="stages" aria-label="Essay stages">
      {GROUPS.map((g) => {
        const indexes = g.ids.map((id) => steps.findIndex((s) => s.id === id))
        const done = indexes.filter((i) => steps[i].ready(draft) && steps[i].id !== 'review').length
        const active = indexes.includes(current)
        return (
          <section key={g.title} className="stage-group">
            <header>
              <span>{g.title}</span>
              <span>
                {g.title === 'Synthesis'
                  ? 'Final'
                  : active
                    ? `${done}/${g.ids.length} · active`
                    : `${done}/${g.ids.length} done`}
              </span>
            </header>
            <ol>
              {indexes.map((i) => (
                <li key={steps[i].id}>
                  <StageCard
                    n={i + 1}
                    label={steps[i].label}
                    stage={info(steps[i].id, draft)}
                    draft={draft}
                    isCurrent={i === current}
                    isDone={steps[i].ready(draft) && steps[i].id !== 'review'}
                    locked={!reachable(i)}
                    onClick={() => onSelect(i)}
                  />
                </li>
              ))}
            </ol>
          </section>
        )
      })}
      <SourcesPanel draft={draft} update={update} />
      <button type="button" className="link" onClick={onNewEssay}>
        Start a new essay
      </button>
    </nav>
  )
}

type CardProps = {
  n: number
  label: string
  stage: StageInfo
  draft: Draft
  isCurrent: boolean
  isDone: boolean
  locked: boolean
  onClick: () => void
}

function StageCard({ n, label, stage, draft, isCurrent, isDone, locked, onClick }: CardProps) {
  const text = stage.section ? (draft.sections[stage.section] ?? '') : ''
  const words = wordCount(text)
  const icon = locked ? '🔒' : isCurrent ? '✎' : isDone ? '✓' : n
  const tag = locked
    ? stage.section?.startsWith('body')
      ? 'Pending'
      : stage.tag === 'Final'
        ? 'Final'
        : 'Later'
    : words > 0
      ? `${words} words`
      : stage.tag

  return (
    <button
      type="button"
      className={`stage${isCurrent ? ' current' : ''}${isDone ? ' done' : ''}`}
      disabled={locked}
      aria-current={isCurrent ? 'step' : undefined}
      onClick={onClick}
    >
      {isCurrent && <span className="now-ribbon">NOW</span>}
      <span className="stage-top">
        <span className="stage-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="stage-title">
          {n}. {label}
        </span>
        {!isCurrent && <span className="stage-tag">{tag}</span>}
      </span>
      {stage.quote && (
        <span className="stage-prompt" title={stage.quote}>
          “{stage.quote}”
        </span>
      )}
      <span className="stage-sub">{stage.sub}</span>

      {isDone && !isCurrent && <span className="stage-meta">Complete</span>}
    </button>
  )
}

const IMAGE = /\.(png|jpe?g|heic|webp|gif)$/i

// Uploaded files, always in reach while writing: add more or remove any.
function SourcesPanel({ draft, update }: { draft: Draft; update: (patch: Partial<Draft>) => void }) {
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function add(files: FileList | null) {
    if (!files?.length) return
    setReading(true)
    setError(null)
    const added: Source[] = []
    for (const file of Array.from(files)) {
      try {
        added.push(await readSource(file))
      } catch (e) {
        setError(e instanceof Error ? e.message : `Couldn't read ${file.name}.`)
      }
    }
    update({ sources: [...draft.sources.filter((s) => !added.some((a) => a.name === s.name)), ...added] })
    setReading(false)
  }

  return (
    <section className="stage-group" aria-label="Sources">
      <header>
        <span>Sources</span>
        <span>{draft.sources.length ? `${draft.sources.length} attached` : 'None yet'}</span>
      </header>
      <div className="source-panel">
        {draft.sources.length > 0 && (
          <ul>
            {draft.sources.map((s) => (
              <li key={s.name}>
                <span aria-hidden="true">{IMAGE.test(s.name) ? '🖼️' : '📄'}</span>
                <span className="source-name" title={s.name}>
                  {s.name}
                </span>
                <button
                  type="button"
                  className="source-remove"
                  aria-label={`Remove ${s.name}`}
                  onClick={() => update({ sources: draft.sources.filter((x) => x.name !== s.name) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="upload small-upload">
          <input
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown,image/*"
            multiple
            onChange={(e) => {
              add(e.target.files)
              e.target.value = ''
            }}
          />
          <span>{reading ? 'Reading…' : '📎 Add files or photos'}</span>
        </label>
        <ErrorNote message={error} />
      </div>
    </section>
  )
}
