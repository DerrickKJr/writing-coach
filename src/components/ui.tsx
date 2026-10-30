import type { ReactNode } from 'react'

export function Thinking({ label = 'Gemma is thinking…' }: { label?: string }) {
  return (
    <p className="thinking" role="status">
      <span className="dot" aria-hidden="true" />
      {label}
    </p>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="error" role="alert">
      {message}
    </p>
  )
}

export function CoachBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="coach-box" aria-label={title}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function DictationTip() {
  return (
    <p className="tip">
      🎙️ Rather talk it out? Press <kbd>fn</kbd> twice (Mac dictation) and speak into any box.
    </p>
  )
}
