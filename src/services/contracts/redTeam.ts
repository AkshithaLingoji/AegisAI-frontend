import type {
  BackendConnectionStatus,
  ReportExport,
  ReportReference,
  ScenarioDefinition,
  ScenarioExecutionRequest,
  ScenarioExecutionStatus,
  ScenarioResult,
} from '@/domain'

/**
 * The Red-Team Lab's data access. @provisional: operation names are the frontend's
 * own seam, not a backend API, and no endpoint, URL or payload is implied.
 *
 * Every operation rejects with `NotConnectedError` when the backend is selected but
 * not connected. Operations a source cannot perform reject with `RedTeamServiceError`.
 */
export interface RedTeamService {
  /** Answers "is the Red-Team subsystem being served, and by what?". Never infers a connection. */
  getConnectionStatus(): Promise<BackendConnectionStatus>
  listScenarios(): Promise<ScenarioDefinition[]>
  getScenario(scenarioId: string): Promise<ScenarioDefinition>
  /** Starts an execution. Resolves with its STATUS (usually pending); it never returns a result. */
  startExecution(request: ScenarioExecutionRequest): Promise<ScenarioExecutionStatus>
  getExecutionStatus(executionId: string): Promise<ScenarioExecutionStatus>
  /** Rejects with `not-available` while the execution has no result yet. */
  getExecutionResult(executionId: string): Promise<ScenarioResult>
  listExecutions(): Promise<ScenarioExecutionStatus[]>
  listReports(): Promise<ReportReference[]>
  getReport(reportId: string): Promise<ReportReference>
  exportReport(reportId: string, format: string): Promise<ReportExport>
}

export type RedTeamServiceErrorCode =
  /** The selected source has no such capability (e.g. the mock has no runner). */
  | 'not-supported'
  | 'not-found'
  /** The thing exists but has no data yet (e.g. a result for a running execution). */
  | 'not-available'
  /** Data from the source did not have the fields the frontend needs. */
  | 'invalid-data'

export class RedTeamServiceError extends Error {
  override name = 'RedTeamServiceError'
  readonly code: RedTeamServiceErrorCode
  readonly issues: string[]
  constructor(code: RedTeamServiceErrorCode, message: string, issues: string[] = []) {
    super(message)
    this.code = code
    this.issues = issues
  }
}
