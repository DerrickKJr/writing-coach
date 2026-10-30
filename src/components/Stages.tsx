import { wordCount, type Draft } from '../lib/essay'

type StageInfo = { tag: string; sub: string; target?: number; section?: string }

// What each stage card says about the student's progress so far.
function info(id: string, d: Draft): StageInfo {
  if (id === 'setup') {
    return {
      tag: d.sources.length ? `${d.sources.length} source${d.sources.length > 1 ? 's' : ''}` : 'Prompt',
      sub: `${d.essayType} · ${d.grade}`,
    }
  }
  if (id === 'thesis')
    return { tag: d.thesis ? `${wordCount(d.thesis)} words` : 'Claim', sub: d.thesis || 'One sentence you can defend' }
  if (id === 'points') {
    const filled = d.points.filter((p) => p.trim())
    return { tag: `${filled.length}/3`, sub: filled.length ? filled.join(' · ') : 'Three reasons it’s true' }
  }
  if (id.startsWith('body-')) {
    const i = Number(id.slice(5))
    return { tag: 'Body', sub: d.points[i] || 'Your point', target: 100, section: id }
  }
  if (id === 'intro') return { tag: 'Framing', sub: 'Hook & background', target: 60, section: id }
  if (id === 'conclusion') return { tag: 'Framing', sub: 'Wrap-up & so what', target: 60, section: id }
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
}

export function Stages({ steps, current, draft, reachable, onSelect, onNewEssay }: Props) {
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
      <span className="stage-sub">{stage.sub}</span>

      {stage.section && !locked && (isCurrent || words > 0) && (
        <span className="stage-detail">
          <span className="stage-stats">
            <span>{words} words</span>
            <span>
              <strong>~{stage.target}</strong> goal
            </span>
          </span>
          <span className="stage-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (words / (stage.target ?? 100)) * 100)}%` }} />
          </span>
          <span className="stage-foot">
            <span>{words === 0 ? 'Not started' : words < (stage.target ?? 100) * 0.6 ? 'In progress' : 'Drafted'}</span>
            <span>{Math.min(100, Math.round((words / (stage.target ?? 100)) * 100))}%</span>
          </span>
        </span>
      )}
      {!stage.section && isDone && !isCurrent && <span className="stage-meta">Complete</span>}
    </button>
  )
}
