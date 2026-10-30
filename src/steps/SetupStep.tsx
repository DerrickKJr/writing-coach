import { ESSAY_TYPES, GRADE_LEVELS } from '../lib/essay'
import { DictationTip } from '../components/ui'
import type { StepProps } from './types'

export function SetupStep({ draft, update }: StepProps) {
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
    </>
  )
}
