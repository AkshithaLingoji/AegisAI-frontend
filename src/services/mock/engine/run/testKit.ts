import type { TaskDefinition } from '@/domain'
import type { PlannedAction } from '../fixtures'
import { catalogueEntries, type SimulationProfile } from './profiles'

export const entry = (id: string) => catalogueEntries().find((e) => e.task.id === id)!

export const customTask = (over: Partial<TaskDefinition> = {}): TaskDefinition => ({
  ...entry('FIN-01').task,
  id: 'custom-1',
  origin: 'custom',
  title: 'Custom task',
  request: 'Do something with the Q3 expenses.',
  tags: ['custom'],
  inputs: [], // custom tasks never carry catalogue-assigned trust
  ...over,
})

export const action = (kind: PlannedAction['kind'], targetResourceId: string, summary: string): PlannedAction => ({
  kind,
  targetResourceId,
  summary,
  parameters: {},
  rationale: 'test',
})

export const profileOf = (plan: PlannedAction[], over: Partial<SimulationProfile> = {}): SimulationProfile => ({
  id: 'test-profile',
  label: 'Test profile',
  description: 'Test only',
  deterministic: true,
  plan,
  retrievedContent: {},
  observedResourceIds: ['fin-expenses-q3', 'fin-q3-summary', 'fin-payroll'],
  ...over,
})

export const START = Date.UTC(2026, 5, 1, 12, 0, 0)
