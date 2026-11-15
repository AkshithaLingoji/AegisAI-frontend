/**
 * Agent Operations view model.
 *
 * Everything is derived from service-provided records (agents, principals,
 * tools, resources, scenarios, experiments, audit). Nothing here decides what
 * an agent or user is allowed to do: "permitted" and "restricted" simply
 * restate what the identity record lists, and "out of scope" is a description
 * of recorded data, not a security verdict.
 */
import type {
  ActionProposal,
  Agent,
  AgentTool,
  AuditRecord,
  AuthenticatedPrincipal,
  ExecutionEvent,
  ExperimentResult,
  GatewayResult,
  PolicyEvaluation,
  ResourceMetadata,
  Scenario,
} from '@/domain'

export type Condition = 'baseline' | 'protected'

export interface AgentOperationsInput {
  agents: Agent[]
  principals: AuthenticatedPrincipal[]
  tools: AgentTool[]
  scenarios: Scenario[]
  resources: ResourceMetadata[]
  experiments: ExperimentResult[]
  audit: AuditRecord[]
}

export interface UseCounts {
  proposed: number
  executed: number
  blocked: number
}

export interface ResourceView {
  resource: ResourceMetadata
  /** What the user's identity record lists. `undefined` when the record doesn't say. */
  permitted: boolean | undefined
  uses: UseCounts
}

export type ToolGrant = 'listed' | 'not-listed' | 'no-scope-needed'

export interface ToolView {
  tool: AgentTool
  /** Whether the user's recorded scopes include the scope this tool needs. */
  grant: ToolGrant
  uses: UseCounts
}

export type ProposalOutcome = 'executed' | 'blocked' | 'unknown'

export interface ProposalView {
  proposal: ActionProposal
  resourceName: string
  toolName?: string
  /** `undefined` = the identity record doesn't say, so nothing is asserted. */
  outOfScope: boolean | undefined
  evaluation?: PolicyEvaluation
  gateway?: GatewayResult
  outcome: ProposalOutcome
}

export interface RunView {
  experimentId: string
  condition: Condition
  startedAt: string
  completedAt: string
  proposals: ProposalView[]
  events: ExecutionEvent[]
  finalReport?: string
  uses: UseCounts
  outOfScopeExecuted: number
  outOfScopeBlocked: number
}

export interface TaskView {
  scenario: Scenario
  prompt: string
  submittedAt: string
  /** Baseline first, then Protected. */
  runs: RunView[]
}

export interface AgentAuditView {
  record: AuditRecord
  scenarioId?: string
  condition?: string
  resourceName?: string
  /** True when the record targets a resource the user is not listed for. */
  needsAttention: boolean
}

export interface AgentWorkspace {
  agent: Agent
  principal?: AuthenticatedPrincipal
  /** Tasks with no finished run. Empty whenever nothing is recorded as running. */
  currentTasks: TaskView[]
  previousTasks: TaskView[]
  tools: ToolView[]
  permittedResources: ResourceView[]
  restrictedResources: ResourceView[]
  /** Resources whose permission status the identity record doesn't state. */
  unknownResources: ResourceView[]
  totals: UseCounts & { runs: number; outOfScopeProposed: number }
  lastRunAt?: string
  audit: AgentAuditView[]
}

export interface AgentOperationsModel {
  agents: AgentWorkspace[]
}

const isCondition = (c: string): c is Condition => c === 'baseline' || c === 'protected'
const zero = (): UseCounts => ({ proposed: 0, executed: 0, blocked: 0 })

export function buildAgentOperationsModel(input: AgentOperationsInput): AgentOperationsModel {
  const { agents, principals, tools, scenarios, resources, experiments, audit } = input
  const principalById = new Map(principals.map((p) => [p.id, p]))
  const resourceById = new Map(resources.map((r) => [r.id, r]))
  const experimentByRun = new Map(experiments.map((e) => [e.runId, e]))

  return {
    agents: agents.map((agent) => {
      const agentScenarios = scenarios.filter((s) => s.task.agentId === agent.id)
      const principal = principalById.get(agentScenarios[0]?.task.principalId ?? '')
      const agentTools = tools.filter((t) => t.agentId === agent.id)

      const outOfScope = (resourceId: string): boolean | undefined =>
        principal?.permittedResourceIds ? !principal.permittedResourceIds.includes(resourceId) : undefined

      const toolFor = (p: ActionProposal) =>
        agentTools.find(
          (t) => t.actionKind === p.kind && (!t.resourceIds || t.resourceIds.includes(p.targetResourceId)),
        )

      const toolUses = new Map<string, UseCounts>()
      const resourceUses = new Map<string, UseCounts>()
      const bump = (map: Map<string, UseCounts>, key: string, outcome: ProposalOutcome) => {
        const u = map.get(key) ?? zero()
        u.proposed += 1
        if (outcome === 'executed') u.executed += 1
        if (outcome === 'blocked') u.blocked += 1
        map.set(key, u)
      }

      const totals = { ...zero(), runs: 0, outOfScopeProposed: 0 }
      let lastRunAt: string | undefined

      const tasks: TaskView[] = agentScenarios.map((scenario) => {
        const runs: RunView[] = experiments
          .filter((e) => e.scenarioId === scenario.id && isCondition(e.condition))
          .sort((a, b) => (a.condition === b.condition ? 0 : a.condition === 'baseline' ? -1 : 1))
          .map((exp) => {
            const uses = zero()
            let oosExecuted = 0
            let oosBlocked = 0
            const proposals: ProposalView[] = [...exp.proposals]
              .sort((a, b) => a.sequence - b.sequence)
              .map((proposal) => {
                const gateway = exp.gatewayResults.find((g) => g.proposalId === proposal.id)
                const evaluation = exp.policyEvaluations.find((e) => e.proposalId === proposal.id)
                const outcome: ProposalOutcome =
                  gateway?.outcome === 'executed' ? 'executed' : gateway?.outcome === 'blocked' ? 'blocked' : 'unknown'
                const oos = outOfScope(proposal.targetResourceId)
                const tool = toolFor(proposal)

                uses.proposed += 1
                if (outcome === 'executed') uses.executed += 1
                if (outcome === 'blocked') uses.blocked += 1
                if (oos) {
                  totals.outOfScopeProposed += 1
                  if (outcome === 'executed') oosExecuted += 1
                  if (outcome === 'blocked') oosBlocked += 1
                }
                bump(resourceUses, proposal.targetResourceId, outcome)
                if (tool) bump(toolUses, tool.id, outcome)

                return {
                  proposal,
                  resourceName: resourceById.get(proposal.targetResourceId)?.name ?? proposal.targetResourceId,
                  toolName: tool?.name,
                  outOfScope: oos,
                  evaluation,
                  gateway,
                  outcome,
                }
              })

            totals.runs += 1
            totals.proposed += uses.proposed
            totals.executed += uses.executed
            totals.blocked += uses.blocked
            if (!lastRunAt || exp.completedAt > lastRunAt) lastRunAt = exp.completedAt

            return {
              experimentId: exp.id,
              condition: exp.condition as Condition,
              startedAt: exp.startedAt,
              completedAt: exp.completedAt,
              proposals,
              events: [...exp.events].sort((a, b) => a.sequence - b.sequence),
              finalReport: exp.finalReport,
              uses,
              outOfScopeExecuted: oosExecuted,
              outOfScopeBlocked: oosBlocked,
            }
          })
        return { scenario, prompt: scenario.task.prompt, submittedAt: scenario.task.submittedAt, runs }
      })

      // A task is "current" only if the agent is recorded as running and the task has no finished run.
      const currentTasks = agent.status === 'running' ? tasks.filter((t) => t.runs.length === 0) : []
      const previousTasks = tasks
        .filter((t) => t.runs.length > 0)
        .sort((a, b) => a.scenario.id.localeCompare(b.scenario.id))

      const domainResources = resources.filter((r) => r.domain === agent.domain)
      const toResourceView = (resource: ResourceMetadata): ResourceView => ({
        resource,
        permitted: principal?.permittedResourceIds ? principal.permittedResourceIds.includes(resource.id) : undefined,
        uses: resourceUses.get(resource.id) ?? zero(),
      })
      const resourceViews = domainResources.map(toResourceView)

      const agentRunIds = new Set(
        experiments.filter((e) => agentScenarios.some((s) => s.id === e.scenarioId)).map((e) => e.runId),
      )

      return {
        agent,
        principal,
        currentTasks,
        previousTasks,
        tools: agentTools.map((tool) => ({
          tool,
          grant: !tool.requiredScope
            ? 'no-scope-needed'
            : principal?.scopes.includes(tool.requiredScope)
              ? 'listed'
              : 'not-listed',
          uses: toolUses.get(tool.id) ?? zero(),
        })),
        permittedResources: resourceViews.filter((r) => r.permitted === true),
        restrictedResources: resourceViews.filter((r) => r.permitted === false),
        unknownResources: resourceViews.filter((r) => r.permitted === undefined),
        totals,
        lastRunAt,
        audit: audit
          .filter((r) => r.principalId === agent.id || (r.runId !== undefined && agentRunIds.has(r.runId)))
          .map((record) => {
            const exp = record.runId ? experimentByRun.get(record.runId) : undefined
            return {
              record,
              scenarioId: exp?.scenarioId,
              condition: exp ? String(exp.condition) : undefined,
              resourceName: record.resourceId ? (resourceById.get(record.resourceId)?.name ?? record.resourceId) : undefined,
              needsAttention: record.resourceId ? outOfScope(record.resourceId) === true : false,
            }
          })
          .sort((a, b) => b.record.timestamp.localeCompare(a.record.timestamp)),
      }
    }),
  }
}
