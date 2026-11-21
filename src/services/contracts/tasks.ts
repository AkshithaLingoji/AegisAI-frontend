import type { RunRecord, TaskDefinition } from '@/domain'

/**
 * A scripted behaviour a custom task can be run with. DEVELOPMENT-ONLY: it exists
 * because the mock cannot interpret requests. A real backend would not serve this
 * (its adapter rejects), and the UI then offers no scenario choice.
 * @provisional
 */
export interface SimulationScenarioOption {
  id: string
  label: string
  description: string
  includesApproval: boolean
  /** The agent, simulated acting identity and resources the script uses. */
  template: TaskDefinition
}

/** A predefined task as the guided workflow presents it. @provisional */
export interface GuidedTaskOption {
  task: TaskDefinition
  /** Plain-language "what this demonstrates"; descriptive only, it does not state outcomes. */
  objective: string
  /** Whether this task's script includes a simulated human approval step. */
  includesApproval: boolean
}

export interface TasksService {
  /** Predefined tasks offered by the guided workflow. */
  listTasks(): Promise<GuidedTaskOption[]>
  /** Mock only: the scripts a custom task can be run with. */
  listSimulationScenarios(): Promise<SimulationScenarioOption[]>
}

export interface StartRunRequest {
  task: TaskDefinition
  /** Mock only: which script a CUSTOM task follows. Ignored for catalogue tasks. */
  simulationScenarioId?: string
}

export interface ResolveApprovalRequest {
  runId: string
  requestId: string
  outcome: 'approved' | 'rejected'
  note?: string
}

/**
 * Runs started from the guided workflow. History is session-only in the mock
 * (lost on reload) and is never mixed into the Command Center's seeded figures.
 */
export interface RunsService {
  /** Starts a run on the Protected path (assurance layer applied). */
  startRun(request: StartRunRequest): Promise<RunRecord>
  /** Appends the resolution and resumes the paused run. Returns the updated record. */
  resolveApproval(request: ResolveApprovalRequest): Promise<RunRecord>
  getRun(runId: string): Promise<RunRecord>
  listRuns(): Promise<RunRecord[]>
}
