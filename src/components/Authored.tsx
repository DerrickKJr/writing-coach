import { attribute } from '../lib/authorship'
import { GAP_MARKER } from '../lib/coach'

// A Gemma draft with the student's own words highlighted, any evidence gap flagged,
// and a meter showing how much of it is theirs.
export function Authored({ text, sources }: { text: string; sources: string[] }) {
  const { tokens, percent } = attribute(text, sources)

  let inGap = false
  const rendered = tokens.map((t, i) => {
    const gap = inGap || t.text.includes('[')
    inGap = gap && !t.text.includes(']')
    if (gap) return <span key={i} className="gap">{t.text}</span>
    return t.yours ? <mark key={i}>{t.text}</mark> : <span key={i}>{t.text}</span>
  })

  return (
    <>
      <p className="chunk-text">{rendered}</p>
      {text.includes(GAP_MARKER) && (
        <p className="hint warn">Fill in the highlighted gap with real evidence before you hand this in.</p>
      )}
      <div className="meter" aria-label={`${percent}% of the key words are yours`}>
        <div className="meter-bar">
          <div className="meter-fill" style={{ width: `${percent}%` }} />
        </div>
        <span>
          <strong>{percent}%</strong> your words <span className="hint">(highlighted)</span>
        </span>
      </div>
    </>
  )
}
