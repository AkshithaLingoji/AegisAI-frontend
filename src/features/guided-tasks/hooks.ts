import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { RunRecord } from '@/domain'
import { configuredSource, services, type ResolveApprovalRequest, type StartRunRequest } from '@/services'

/** Everything the chooser/context screens need, through the service interfaces. No mock fallback. */
export function useGuidedCatalogue() {
  return useQuery({
    queryKey: ['guided', 'catalogue', configuredSource],
    queryFn: async () => {
      const [tasks, resources, agents, principals] = await Promise.all([
        services.tasks.listTasks(),
        services.resources.listResources(),
        services.agents.listAgents(),
        services.agents.listPrincipals(),
      ])
      return { tasks, resources, agents, principals }
    },
    retry: false,
    staleTime: Infinity,
  })
}

/** Scripts a custom task can follow. Mock only: a backend adapter rejects and the custom path says why. */
export function useSimulationScenarios() {
  return useQuery({
    queryKey: ['guided', 'scenarios', configuredSource],
    queryFn: () => services.tasks.listSimulationScenarios(),
    retry: false,
    staleTime: Infinity,
  })
}

export const runKey = (runId: string) => ['guided', 'run', configuredSource, runId] as const
const runsKey = ['guided', 'runs', configuredSource] as const

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: runKey(runId ?? 'none'),
    queryFn: () => services.runs.getRun(runId!),
    enabled: runId !== null,
    retry: false,
    staleTime: Infinity,
  })
}

export function useSessionRuns() {
  return useQuery({ queryKey: runsKey, queryFn: () => services.runs.listRuns(), retry: false })
}

export function useStartRun() {
  const client = useQueryClient()
  return useMutation<RunRecord, Error, StartRunRequest>({
    mutationFn: (request) => services.runs.startRun(request),
    onSuccess: (run) => {
      client.setQueryData(runKey(run.id), run)
      void client.invalidateQueries({ queryKey: runsKey })
    },
  })
}

export function useResolveApproval() {
  const client = useQueryClient()
  return useMutation<RunRecord, Error, ResolveApprovalRequest>({
    mutationFn: (request) => services.runs.resolveApproval(request),
    onSuccess: (run) => {
      client.setQueryData(runKey(run.id), run)
      void client.invalidateQueries({ queryKey: runsKey })
    },
  })
}
