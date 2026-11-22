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
