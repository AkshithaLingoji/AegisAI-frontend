import { useQuery } from '@tanstack/react-query'
import { configuredSource, services } from '@/services'
import { buildCommandCenterModel, type CommandCenterModel } from './model'

/**
 * Loads everything the Command Center needs through the service interfaces and
 * derives the view model. If any service fails (e.g. the backend is not
 * reachable) the whole query fails — there is no partial or mock fallback.
 */
export function useCommandCenter() {
  return useQuery<CommandCenterModel>({
    queryKey: ['command-center', configuredSource],
    queryFn: async () => {
      const [agents, principals, scenarios, resources, experiments] = await Promise.all([
        services.agents.listAgents(),
        services.agents.listPrincipals(),
        services.scenarios.listScenarios(),
        services.resources.listResources(),
        services.experiments.listExperiments(),
      ])
      return buildCommandCenterModel({ agents, principals, scenarios, resources, experiments })
    },
    retry: false,
    staleTime: Infinity,
  })
}
