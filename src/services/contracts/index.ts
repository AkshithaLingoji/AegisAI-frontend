import type { AgentsService } from './agents'
import type { AuditService } from './audit'
import type { ExperimentsService } from './experiments'
import type { RedTeamService } from './redTeam'
import type { ResourcesService } from './resources'
import type { ScenariosService } from './scenarios'
import type { RunsService, TasksService } from './tasks'
import type { SystemService } from './system'

export * from './agents'
export * from './audit'
export * from './errors'
export * from './experiments'
export * from './redTeam'
export * from './resources'
export * from './scenarios'
export * from './system'
export * from './tasks'

/**
 * The full set of data services the UI may use. Each has a mock implementation
 * and a backend adapter behind the same interface.
 */
export interface AegisServices {
  system: SystemService
  agents: AgentsService
  scenarios: ScenariosService
  resources: ResourcesService
  experiments: ExperimentsService
  audit: AuditService
  tasks: TasksService
  runs: RunsService
  redTeam: RedTeamService
}
