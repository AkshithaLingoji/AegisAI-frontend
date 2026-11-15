/**
 * Command Center view model.
 *
 * Every figure is derived here from the recorded execution data (proposals,
 * policy evaluations, gateway results, resource changes). Nothing is supplied
 * as a pre-computed aggregate, so the same code works unchanged when the
 * records come from the real backend.
 *
 * "Out of scope" means: the action targets a resource the acting user's
 * identity record does not list as permitted. It is a description of the
 * recorded data, not a security verdict.
 */
import type {
  ActionProposal,
  Agent,
  AuthenticatedPrincipal,
  ExperimentResult,
  ResourceMetadata,
  Scenario,
} from '@/domain'

export type Condition = 'baseline' | 'protected'
export const CONDITIONS: Condition[] = ['baseline', 'protected']

export interface CommandCenterInput {
  agents: Agent[]
  principals: AuthenticatedPrincipal[]
  scenarios: Scenario[]
  resources: ResourceMetadata[]
  experiments: ExperimentResult[]
}

export interface ConditionTotals {
  runs: number
  proposed: number
  executed: number
  blocked: number
  /** Proposals that received a policy evaluation (zero without an assurance layer). */
  evaluated: number
  allowed: number
  denied: number
  outOfScopeProposed: number
  outOfScopeExecuted: number
  outOfScopeBlocked: number
}

export type RunVerdict = 'within-scope' | 'out-of-scope-executed' | 'out-of-scope-blocked'

export interface RunOutcome {
  experimentId: string
  condition: Condition
  scenarioId: string
  completedAt: string
  proposed: number
  executed: number
  blocked: number
  outOfScopeExecuted: number
  outOfScopeBlocked: number
  changedResourceIds: string[]
  verdict: RunVerdict
}

export interface ScenarioOverview {
  scenario: Scenario
  baseline?: RunOutcome
  protected?: RunOutcome
}

export interface AgentOverview {
  agent: Agent
  principal?: AuthenticatedPrincipal
  permittedResources: ResourceMetadata[]
  runs: number
  proposed: number
  lastRunAt?: string
}

export interface ResourceOverview {
  resource: ResourceMetadata
  permittedFor: string[]
  /** Out-of-scope proposals aimed at this resource, by what happened to them. */
  attempts: Record<Condition, { executed: number; blocked: number }>
  /** Runs in which this resource's state actually changed. */
  changedRuns: Record<Condition, number>
}

export interface NotableAction {
  id: string
  timestamp: string
  scenarioId: string
  scenarioTitle: string
  condition: Condition
  summary: string
  resourceName: string
  outcome: 'executed' | 'blocked'
  reason: string
}

export interface CommandCenterModel {
  counts: { agents: number; scenarios: number; runs: number; resources: number }
  totals: Record<Condition, ConditionTotals>
  scenarios: ScenarioOverview[]
  agents: AgentOverview[]
  resources: ResourceOverview[]
  /** Newest first. */
  runs: RunOutcome[]
  /** Out-of-scope actions, newest first. */
  notable: NotableAction[]
}

const emptyTotals = (): ConditionTotals => ({
  runs: 0, proposed: 0, executed: 0, blocked: 0, evaluated: 0, allowed: 0, denied: 0,
  outOfScopeProposed: 0, outOfScopeExecuted: 0, outOfScopeBlocked: 0,
})

const isCondition = (c: string): c is Condition => c === 'baseline' || c === 'protected'

export function buildCommandCenterModel(input: CommandCenterInput): CommandCenterModel {
  const { agents, principals, scenarios, resources, experiments } = input
  const scenarioById = new Map(scenarios.map((s) => [s.id, s]))
  const principalById = new Map(principals.map((p) => [p.id, p]))
  const resourceById = new Map(resources.map((r) => [r.id, r]))

  const isOutOfScope = (exp: ExperimentResult, proposal: ActionProposal): boolean => {
    const scenario = scenarioById.get(exp.scenarioId)
    const principal = scenario ? principalById.get(scenario.task.principalId) : undefined
    if (!principal?.permittedResourceIds) return false // unknown scope: don't assert anything
    return !principal.permittedResourceIds.includes(proposal.targetResourceId)
  }

  const totals: Record<Condition, ConditionTotals> = { baseline: emptyTotals(), protected: emptyTotals() }
  const runs: RunOutcome[] = []
  const notable: NotableAction[] = []
  const resourceStats = new Map<string, ResourceOverview['attempts'] & { _changed: Record<Condition, number> }>()
  const stat = (id: string) => {
    let s = resourceStats.get(id)
    if (!s) {
      s = {
        baseline: { executed: 0, blocked: 0 },
        protected: { executed: 0, blocked: 0 },
        _changed: { baseline: 0, protected: 0 },
      }
      resourceStats.set(id, s)
    }
    return s
  }

  for (const exp of experiments) {
    if (!isCondition(exp.condition)) continue // unknown conditions are not aggregated
    const condition = exp.condition
    const t = totals[condition]
    t.runs += 1

    let executed = 0, blocked = 0, oosExecuted = 0, oosBlocked = 0
    for (const proposal of exp.proposals) {
      const gateway = exp.gatewayResults.find((g) => g.proposalId === proposal.id)
      const evaluation = exp.policyEvaluations.find((e) => e.proposalId === proposal.id)
      const ran = gateway?.outcome === 'executed'
      const stopped = gateway?.outcome === 'blocked'
      const oos = isOutOfScope(exp, proposal)

      t.proposed += 1
      if (ran) { t.executed += 1; executed += 1 }
      if (stopped) { t.blocked += 1; blocked += 1 }
      if (evaluation) {
        t.evaluated += 1
        if (evaluation.decision === 'allow') t.allowed += 1
        if (evaluation.decision === 'deny') t.denied += 1
      }
      if (oos) {
        t.outOfScopeProposed += 1
        if (ran) { t.outOfScopeExecuted += 1; oosExecuted += 1; stat(proposal.targetResourceId)[condition].executed += 1 }
        if (stopped) { t.outOfScopeBlocked += 1; oosBlocked += 1; stat(proposal.targetResourceId)[condition].blocked += 1 }
        if (ran || stopped) {
          const scenario = scenarioById.get(exp.scenarioId)
          notable.push({
            id: proposal.id,
            timestamp: gateway!.occurredAt,
            scenarioId: exp.scenarioId,
            scenarioTitle: scenario?.title ?? exp.scenarioId,
            condition,
            summary: proposal.summary,
            resourceName: resourceById.get(proposal.targetResourceId)?.name ?? proposal.targetResourceId,
            outcome: ran ? 'executed' : 'blocked',
            reason: evaluation?.reasons[0]?.message ?? 'No assurance layer was in place to check this action.',
          })
        }
      }
    }

    const changedResourceIds = exp.resourceChanges
      .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after))
      .map((c) => c.resourceId)
    for (const id of changedResourceIds) stat(id)._changed[condition] += 1

    runs.push({
      experimentId: exp.id,
      condition,
      scenarioId: exp.scenarioId,
      completedAt: exp.completedAt,
      proposed: exp.proposals.length,
      executed,
      blocked,
      outOfScopeExecuted: oosExecuted,
      outOfScopeBlocked: oosBlocked,
      changedResourceIds,
      verdict: oosExecuted > 0 ? 'out-of-scope-executed' : oosBlocked > 0 ? 'out-of-scope-blocked' : 'within-scope',
    })
  }

  const newestFirst = <T extends { completedAt?: string; timestamp?: string }>(a: T, b: T) =>
    (b.completedAt ?? b.timestamp ?? '').localeCompare(a.completedAt ?? a.timestamp ?? '')
  runs.sort(newestFirst)
  notable.sort(newestFirst)

  const agentOverviews: AgentOverview[] = agents.map((agent) => {
    const agentScenarios = scenarios.filter((s) => s.task.agentId === agent.id)
    const principal = principalById.get(agentScenarios[0]?.task.principalId ?? '')
    const agentRuns = runs.filter((r) => agentScenarios.some((s) => s.id === r.scenarioId))
    return {
      agent,
      principal,
      permittedResources: (principal?.permittedResourceIds ?? []).flatMap((id) => resourceById.get(id) ?? []),
      runs: agentRuns.length,
      proposed: agentRuns.reduce((n, r) => n + r.proposed, 0),
      lastRunAt: agentRuns[0]?.completedAt,
    }
  })

  return {
    counts: { agents: agents.length, scenarios: scenarios.length, runs: runs.length, resources: resources.length },
    totals,
    scenarios: scenarios.map((scenario) => ({
      scenario,
      baseline: runs.find((r) => r.scenarioId === scenario.id && r.condition === 'baseline'),
      protected: runs.find((r) => r.scenarioId === scenario.id && r.condition === 'protected'),
    })),
    agents: agentOverviews,
    resources: resources.map((resource) => {
      const s = stat(resource.id)
      return {
        resource,
        permittedFor: principals.filter((p) => p.permittedResourceIds?.includes(resource.id)).map((p) => p.displayName),
        attempts: { baseline: s.baseline, protected: s.protected },
        changedRuns: s._changed,
      }
    }),
    runs,
    notable,
  }
}
