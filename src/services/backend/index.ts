import type { AegisServices } from '../contracts'
import { notConnected } from './notConnected'
import { createBackendSystemService, type BackendOptions } from './system'

/** Backend adapters. Private to the service layer — import via `@/services`. */
export function createBackendServices(options: BackendOptions): AegisServices {
  const nc = (what: string) => async () => notConnected(what, options.baseUrl)
  return {
    system: createBackendSystemService(options),
    agents: { listAgents: nc('agents'), listPrincipals: nc('principals'), listTools: nc('agent tools') },
    scenarios: { listScenarios: nc('scenarios') },
    resources: { listResources: nc('resources') },
    experiments: { listExperiments: nc('experiments') },
    audit: { listAuditRecords: nc('audit records') },
    tasks: { listTasks: nc('guided tasks'), listSimulationScenarios: nc('simulation scenarios') },
    runs: { startRun: nc('runs'), resolveApproval: nc('approvals'), getRun: nc('runs'), listRuns: nc('runs') },
  }
}
