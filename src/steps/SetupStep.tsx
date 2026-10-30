import { useState } from 'react'
import { ESSAY_TYPES, GRADE_LEVELS, wordCount } from '../lib/essay'
import { MODEL } from '../lib/ollama'
import { readSource, type Source } from '../lib/sources'
import { ErrorNote } from '../components/ui'
import type { StepProps } from './types'

const SAMPLE = 'Should schools ban phones during class? Take a position and support it with evidence.'

export function SetupStep({ draft, update, next }: StepProps) {
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
      <section className="hero">
        <span className="eyebrow">Local AI coaching · runs privately on your device</span>
        <h2>
          Write your paper. Not an AI’s. <em>Small pieces you actually read.</em>
        </h2>
        <p>
          Writing Coach sits beside you like a patient tutor. It asks questions, points out weak spots, and helps you
          build your essay one paragraph at a time, using only your ideas.
        </p>
      </section>

      <div className="stats">
        <div className="stat">
          <strong>100%</strong>
          <span>Your ideas</span>
        </div>
        <div className="stat">
          <strong>Zero</strong>
          <span>Ghostwriting</span>
        </div>
        <div className="stat">
          <strong>{MODEL.split(':')[0].replace('gemma', 'Gemma ')}</strong>
          <span>On-device model</span>
        </div>
        <div className="stat">
          <strong>9</strong>
          <span>Guided stages</span>
        </div>
      </div>

      <div className="setup-card">
        <header>
          <div>
            <h3>Start your essay</h3>
            <p>Tell me about the assignment and I’ll set up your stages.</p>
          </div>
        </header>
        <div className="setup-body">
          <div className="field-head">
            <label htmlFor="assignment">Assignment prompt</label>
            <button type="button" className="sample-link" onClick={() => update({ assignment: SAMPLE })}>
              Fill sample: phones in class
            </button>
          </div>
          <div className="textbox">
            <textarea
              id="assignment"
              rows={4}
              value={draft.assignment}
              onChange={(e) => update({ assignment: e.target.value })}
              placeholder="Paste your teacher’s instructions or the question you’re answering"
            />
            <div className="textbox-foot">
              <span>🎙 Press fn twice to dictate</span>
              <span>
                {wordCount(draft.assignment)} words · {draft.assignment.length} chars
              </span>
            </div>
          </div>

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
              Class readings, articles, your notes, or photos of a worksheet or textbook page (.pdf, .txt, .md or
              images). Gemma reads the text in photos. I'll use them for ideas and evidence and tell you which file each
              fact came from. Files stay on this computer.
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
                    <span>
                      {/\.(png|jpe?g|heic|webp|gif)$/i.test(s.name) ? '🖼️' : '📄'} {s.name}
                    </span>
                    <span className="hint">{s.text.split(' ').length.toLocaleString()} words</span>
                    <button
                      type="button"
                      className="link"
                      onClick={() => remove(s.name)}
                      aria-label={`Remove ${s.name}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="launch">
            <div>
              <strong>Next: Stage 2, Thesis</strong>
              <span>Your 9 stages unlock one at a time as you go.</span>
            </div>
            <button type="button" className="primary" onClick={next} disabled={!draft.assignment.trim()}>
              Start writing →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
