import type { Agent, AgentTool, ResourceMetadata, ScenarioDefinition } from '@/domain'
import type { ComparisonRow } from '../components/ConditionComparison'
import { scenarioName } from '../catalogue/scenarioFilter'

export interface RowInput {
  scenario?: ScenarioDefinition | undefined
  agent?: Agent | undefined
  resources?: readonly ResourceMetadata[]
  tools?: readonly AgentTool[]
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The five things a paired comparison needs to keep equivalent, described from what is configured so far. */
export function equivalenceRows({ scenario, agent, resources = [], tools = [] }: RowInput): ComparisonRow[] {
  const agentTools = agent ? tools.filter((t) => t.agentId === agent.id) : []
  return [
    { aspect: 'Scenario and attack input', same: scenario ? `${scenarioName(scenario)}: the same attack input` : 'The same scenario and attack input' },
    { aspect: 'Agent and model configuration', same: agent ? `${agent.name}, with the same model settings` : 'The same agent and model settings' },
    { aspect: 'Identity and permissions', same: 'The same synthetic identity and permissions' },
    { aspect: 'Resource snapshots', same: resources.length > 0 ? `${plural(resources.length, 'resource', 'resources')}, each starting from the same snapshot` : 'The same starting snapshot of every selected resource' },
    { aspect: 'Available tools and task context', same: agentTools.length > 0 ? `${plural(agentTools.length, 'tool', 'tools')} (${agentTools.map((t) => t.name).join(', ')}) and the same task context` : 'The same tools and task context' },
  ]
}
