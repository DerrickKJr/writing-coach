import { useState } from 'react'
import { ESSAY_TYPES, GRADE_LEVELS } from '../lib/essay'
import { readSource, type Source } from '../lib/sources'
import { DictationTip, ErrorNote } from '../components/ui'
import type { StepProps } from './types'

export function SetupStep({ draft, update }: StepProps) {
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addFiles(files: FileList | null) {
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

  function remove(name: string) {
    update({ sources: draft.sources.filter((s) => s.name !== name) })
  }

  return (
    <>
      <h2>What are you writing?</h2>
      <p className="lead">
        Tell me about the assignment. I won't write it for you, but I'll walk you through it one piece at a time.
      </p>

      <label className="field">
        <span>The assignment or prompt</span>
        <textarea
          rows={4}
          value={draft.assignment}
          onChange={(e) => update({ assignment: e.target.value })}
          placeholder="e.g. Should schools ban phones during class? Take a position and support it."
        />
      </label>
      <DictationTip />

      <div className="row">
        <label className="field">
          <span>Type of essay</span>
          <select value={draft.essayType} onChange={(e) => update({ essayType: e.target.value })}>
            {ESSAY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Level</span>
          <select value={draft.grade} onChange={(e) => update({ grade: e.target.value })}>
            {GRADE_LEVELS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="sources" aria-label="Your sources">
        <h3>Add your sources (optional)</h3>
        <p className="hint">
          Class readings, articles, your notes, or photos of a worksheet or textbook page (.pdf, .txt, .md or images). Gemma reads the text in photos. I'll use them for ideas and evidence and tell you
          which file each fact came from. Files stay on this computer.
        </p>
        <label className="upload">
          <input
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown,image/*"
            multiple
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <span>{reading ? 'Reading files… photos take a few seconds' : '📎 Choose files or photos'}</span>
        </label>
        <ErrorNote message={error} />
        {draft.sources.length > 0 && (
          <ul className="source-list">
            {draft.sources.map((s) => (
              <li key={s.name}>
                <span>{/\.(png|jpe?g|heic|webp|gif)$/i.test(s.name) ? '🖼️' : '📄'} {s.name}</span>
                <span className="hint">{s.text.split(' ').length.toLocaleString()} words</span>
                <button type="button" className="link" onClick={() => remove(s.name)} aria-label={`Remove ${s.name}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
