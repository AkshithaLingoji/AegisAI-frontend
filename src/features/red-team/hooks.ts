import { useQuery } from '@tanstack/react-query'
import { configuredSource, services } from '@/services'

const key = (name: string) => ['red-team', name, configuredSource] as const

/** Each hook asks the service layer only; no fetch or backend detail lives in components. */
export function useRedTeamStatus() {
  return useQuery({ queryKey: key('status'), queryFn: () => services.redTeam.getConnectionStatus(), retry: false })
}
export function useRedTeamScenarios() {
  return useQuery({ queryKey: key('scenarios'), queryFn: () => services.redTeam.listScenarios(), retry: false })
}
export function useRedTeamExecutions() {
  return useQuery({ queryKey: key('executions'), queryFn: () => services.redTeam.listExecutions(), retry: false })
}
export function useRedTeamScenario(scenarioId: string) {
  return useQuery({ queryKey: [...key('scenario'), scenarioId], queryFn: () => services.redTeam.getScenario(scenarioId), retry: false })
}

/**
 * What the configuration screens need beyond scenarios: the existing agent, resource and
 * tool services. If any is unavailable (e.g. the backend is not connected) the query fails
 * as a whole and the page shows that; nothing is substituted.
 */
export function useExperimentOptions() {
  return useQuery({
    queryKey: key('configuration-options'),
    queryFn: async () => {
      const [agents, resources, tools] = await Promise.all([services.agents.listAgents(), services.resources.listResources(), services.agents.listTools()])
      return { agents, resources, tools }
    },
    retry: false,
  })
}
