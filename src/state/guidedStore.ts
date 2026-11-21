import { create } from 'zustand'

export type GuidedStep = 'choose' | 'review' | 'run' | 'decisions' | 'result'
export const GUIDED_STEPS: { id: GuidedStep; label: string }[] = [
  { id: 'choose', label: 'Choose a task' },
  { id: 'review', label: 'Review context' },
  { id: 'run', label: 'Run simulation' },
  { id: 'decisions', label: 'Decisions & approval' },
  { id: 'result', label: 'Final result' },
]

export type InputFormat = 'text' | 'csv' | 'json'
export interface DraftInput {
  key: string
  label: string
  format: InputFormat
  content: string
}
export interface CustomDraft {
  name: string
  /** Kept exactly as typed. */
  request: string
  scenarioId: string
  inputs: DraftInput[]
}

export const CUSTOM = 'custom' as const
export const emptyDraft = (): CustomDraft => ({ name: '', request: '', scenarioId: '', inputs: [] })

interface GuidedState {
  step: GuidedStep
  /** A catalogue task id, or `custom`. */
  selected: string | null
  draft: CustomDraft
  runId: string | null
  select: (selected: string) => void
  setStep: (step: GuidedStep) => void
  updateDraft: (patch: Partial<Omit<CustomDraft, 'inputs'>>) => void
  addInput: () => void
  updateInput: (key: string, patch: Partial<Omit<DraftInput, 'key'>>) => void
  removeInput: (key: string) => void
  setRunId: (runId: string | null) => void
  /** Reopen a run from this session's history. */
  openRun: (run: { id: string; status: 'awaiting_approval' | 'completed'; taskDefinitionId: string; origin: 'catalogue' | 'custom' }) => void
  reset: () => void
}

let inputCounter = 0
const newKey = () => `draft-input-${++inputCounter}`

/** UI-only workflow state. Run data itself lives behind services + TanStack Query. */
export const useGuidedStore = create<GuidedState>((set) => ({
  step: 'choose',
  selected: null,
  draft: emptyDraft(),
  runId: null,
  select: (selected) => set({ selected, runId: null, step: 'review' }),
  setStep: (step) => set({ step }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  addInput: () => set((s) => ({ draft: { ...s.draft, inputs: [...s.draft.inputs, { key: newKey(), label: '', format: 'text', content: '' }] } })),
  updateInput: (key, patch) => set((s) => ({ draft: { ...s.draft, inputs: s.draft.inputs.map((i) => (i.key === key ? { ...i, ...patch } : i)) } })),
  removeInput: (key) => set((s) => ({ draft: { ...s.draft, inputs: s.draft.inputs.filter((i) => i.key !== key) } })),
  setRunId: (runId) => set({ runId }),
  openRun: (run) =>
    set({
      runId: run.id,
      selected: run.origin === 'custom' ? CUSTOM : run.taskDefinitionId,
      step: run.status === 'completed' ? 'result' : 'decisions',
    }),
  reset: () => set({ step: 'choose', selected: null, draft: emptyDraft(), runId: null }),
}))
