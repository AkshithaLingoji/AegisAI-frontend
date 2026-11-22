import type { RedTeamService } from '../contracts'
import { notConnected } from './notConnected'
import type { BackendOptions } from './system'

/**
 * Red-Team backend adapter placeholder. The Red-Team backend's contract has not been
 * supplied, so nothing here may guess an endpoint. The connection status ANSWERS
 * "not connected"; every data operation rejects with `NotConnectedError`. There is
 * no fallback to mock data. When the real adapter is written it will call
 * `mapScenario` / `mapExecutionStatus` / `mapResult` / `mapReport` from
 * `../redTeam/mapping` on whatever the backend returns.
 */
export function createBackendRedTeamService(options: BackendOptions): RedTeamService {
  const nc = (what: string) => async () => notConnected(`Red-Team ${what}`, options.baseUrl)
  const target = options.baseUrl ? ` (configured URL: ${options.baseUrl})` : ' (no VITE_AEGIS_BACKEND_URL configured)'
  return {
    async getConnectionStatus() {
      return {
        state: 'not_connected',
        source: 'backend',
        detail: `The Red-Team backend adapter is not implemented yet${target}. Nothing is being served, and the app does not substitute mock data.`,
      }
    },
    listScenarios: nc('scenarios'),
    getScenario: nc('scenario'),
    startExecution: nc('executions'),
    getExecutionStatus: nc('execution status'),
    getExecutionResult: nc('execution results'),
    listExecutions: nc('execution history'),
    listReports: nc('reports'),
    getReport: nc('report information'),
    exportReport: nc('report export'),
  }
}
