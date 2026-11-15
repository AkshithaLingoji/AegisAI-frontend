import type { Agent, AgentTool, AuthenticatedPrincipal } from '@/domain'

export interface AgentsService {
  listAgents(): Promise<Agent[]>
  /** Identities the agents act on behalf of, with their permitted resources. */
  listPrincipals(): Promise<AuthenticatedPrincipal[]>
  /** Tools each agent can invoke. */
  listTools(): Promise<AgentTool[]>
}
