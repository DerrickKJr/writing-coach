import type { Draft } from '../lib/essay'

export type StepProps = {
  draft: Draft
  update: (patch: Partial<Draft>) => void
}
