import { useQuery } from '@tanstack/react-query'
import { configuredSource, services } from '@/services'
import { buildAgentOperationsModel, type AgentOperationsModel } from './model'

/**
 * Loads everything Agent Operations needs through the service interfaces. If any
 * service fails (e.g. the backend is not reachable) the query fails as a whole;
 * there is no partial or mock fallback.
 */
export function useAgentOperations() {
  return useQuery<AgentOperationsModel>({
    queryKey: ['agent-operations', configuredSource],
    queryFn: async () => {
      const [agents, principals, tools, scenarios, resources, experiments, audit] = await Promise.all([
        services.agents.listAgents(),
        services.agents.listPrincipals(),
        services.agents.listTools(),
        services.scenarios.listScenarios(),
        services.resources.listResources(),
        services.experiments.listExperiments(),
        services.audit.listAuditRecords(),
      ])
      return buildAgentOperationsModel({ agents, principals, tools, scenarios, resources, experiments, audit })
    },
    retry: false,
    staleTime: Infinity,
  })
}
