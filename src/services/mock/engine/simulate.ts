/**
 * Deterministic simulation of one scenario under one condition.
 *
 * IMPORTANT: this is DEMONSTRATION LOGIC for the development mock. The
 * "Protected" rules below are simple, readable checks that stand in for the
 * real AegisAI assurance layer. They are not a policy engine, authorisation
 * layer or gateway, and their output is never backend security evidence.
 *
 * Fairness: both conditions receive the same initial sandbox, the same scripted
 * agent proposals and the same retrieved content. Baseline is not weakened —
 * it simply has no assurance layer, so every proposal executes.
 */
import type {
  ActionProposal,
  AuthenticatedPrincipal,
  ExecutionEvent,
  ExperimentResult,
  GatewayResult,
  PolicyEvaluation,
  ResourceStateChange,
} from '@/domain'
import { agents, initialSandbox, principals, type PlannedAction, type ScenarioFixture, type Sandbox } from './fixtures'

export type Condition = 'baseline' | 'protected'

const STEP_MS = 900

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function evaluateDemoRules(action: PlannedAction, principal: AuthenticatedPrincipal) {
  const reasons: { code: string; message: string }[] = []
  if (!principal.permittedResourceIds?.includes(action.targetResourceId)) {
    reasons.push({
      code: 'OUT_OF_SCOPE_RESOURCE',
      message: `${principal.displayName} is not permitted to use this resource.`,
    })
  }
  if (action.kind === 'export') {
    if (!principal.scopes.includes('export')) {
      reasons.push({ code: 'EXPORT_NOT_GRANTED', message: 'Exporting data is not granted to this user.' })
    }
  } else if (!principal.scopes.includes(action.kind)) {
    reasons.push({ code: 'ACTION_NOT_GRANTED', message: `The “${action.kind}” action is not granted to this user.` })
  }
  const allowed = reasons.length === 0
  return {
    decision: allowed ? 'allow' : 'deny',
    reasons: allowed
      ? [{ code: 'WITHIN_SCOPE', message: 'The action matches what this user is permitted to do.' }]
      : reasons,
    policyRefs: ['demo-rule/resource-scope', 'demo-rule/action-scope'],
  }
}

function applyAction(
  action: PlannedAction,
  sandbox: Sandbox,
  agentName: string,
  readSoFar: string[],
): void {
  const state = sandbox[action.targetResourceId]
  if (!state) return
  if (action.kind === 'read' || action.kind === 'export') {
    state.accessCount = (state.accessCount as number) + 1
    state.lastAccessedBy = agentName
    readSoFar.push(action.targetResourceId)
  }
  if (action.kind === 'export') {
    state.exportedToExternal = true
    state.exportStatus = 'exported to external destination (simulated)'
  }
  if (action.kind === 'write') {
    state.status = 'saved'
    state.sourcesUsed = readSoFar.length ? [...new Set(readSoFar)].join(', ') : 'none'
  }
}

export function simulateRun(fixture: ScenarioFixture, condition: Condition, startMs: number): ExperimentResult {
  const { scenario, plan, retrievedContent } = fixture
  const runId = `run-${scenario.id}-${condition}`
  const agent = agents.find((a) => a.id === scenario.task.agentId)!
  const principal = principals.find((p) => p.id === scenario.task.principalId)!
  const provenance = { source: 'mock' as const, runId }

  const sandbox = initialSandbox()
  const before = clone(sandbox)
  const readSoFar: string[] = []

  const events: ExecutionEvent[] = []
  const proposals: ActionProposal[] = []
  const policyEvaluations: PolicyEvaluation[] = []
  const gatewayResults: GatewayResult[] = []

  let tick = 0
  const at = () => new Date(startMs + tick++ * STEP_MS).toISOString()
  const pushEvent = (e: Omit<ExecutionEvent, 'id' | 'runId' | 'sequence' | 'timestamp' | 'provenance'>) => {
    events.push({ ...e, id: `${runId}-ev${events.length + 1}`, runId, sequence: events.length + 1, timestamp: at(), provenance })
  }

  pushEvent({ kind: 'task_received', summary: `Task received: “${scenario.task.prompt}”` })

  plan.forEach((planned, index) => {
    const n = index + 1
    const proposal: ActionProposal = {
      id: `${runId}-p${n}`,
      taskId: scenario.task.id,
      agentId: agent.id,
      sequence: n,
      kind: planned.kind,
      targetResourceId: planned.targetResourceId,
      summary: planned.summary,
      parameters: clone(planned.parameters),
      rationale: planned.rationale,
    }
    proposals.push(proposal)
    pushEvent({ kind: 'action_proposed', summary: `${agent.name} proposed: ${planned.summary}`, refs: { proposalId: proposal.id, resourceId: planned.targetResourceId } })

    let executed = true
    let evaluationId: string | undefined
    if (condition === 'protected') {
      const result = evaluateDemoRules(planned, principal)
      const evaluation: PolicyEvaluation = {
        id: `${runId}-pe${n}`,
        proposalId: proposal.id,
        decision: result.decision,
        reasons: result.reasons,
        policyRefs: result.policyRefs,
        evaluatedAt: at(),
        provenance,
      }
      policyEvaluations.push(evaluation)
      evaluationId = evaluation.id
      executed = result.decision === 'allow'
      pushEvent({
        kind: 'policy_evaluated',
        summary: `Demonstration rules ${executed ? 'allowed' : 'denied'}: ${planned.summary}`,
        refs: { proposalId: proposal.id, policyEvaluationId: evaluation.id },
      })
    }

    const gateway: GatewayResult = {
      id: `${runId}-gw${n}`,
      proposalId: proposal.id,
      outcome: executed ? 'executed' : 'blocked',
      message:
        condition === 'baseline'
          ? 'Executed directly — this condition has no assurance layer.'
          : executed
            ? 'Executed after an allow decision.'
            : 'Blocked — not executed. The resource was left unchanged.',
      occurredAt: at(),
      provenance,
    }
    gatewayResults.push(gateway)

    const retrieved = executed && planned.kind === 'read' ? retrievedContent[planned.targetResourceId] : undefined
    pushEvent({
      kind: 'gateway_result',
      summary: executed ? `Executed: ${planned.summary}` : `Blocked: ${planned.summary}`,
      refs: { proposalId: proposal.id, gatewayResultId: gateway.id, policyEvaluationId: evaluationId, resourceId: planned.targetResourceId },
      ...(retrieved ? { payload: { retrievedContent: retrieved } } : {}),
    })

    if (executed) {
      const prev = clone(sandbox[planned.targetResourceId])
      applyAction(planned, sandbox, agent.name, readSoFar)
      if (JSON.stringify(prev) !== JSON.stringify(sandbox[planned.targetResourceId])) {
        pushEvent({ kind: 'resource_changed', summary: `Resource updated: ${planned.targetResourceId}`, refs: { resourceId: planned.targetResourceId } })
      }
    }
  })

  const resourceChanges: ResourceStateChange[] = scenario.resourceIds.map((id) => ({
    resourceId: id,
    before: before[id] ?? null,
    after: clone(sandbox[id] ?? null),
  }))

  const executedCount = gatewayResults.filter((g) => g.outcome === 'executed').length
  const finalReport = `${agent.name} finished. ${executedCount} of ${proposals.length} proposed actions ran.`
  pushEvent({ kind: 'report_generated', summary: finalReport })

  return {
    id: `exp-${scenario.id}-${condition}`,
    scenarioId: scenario.id,
    condition,
    runId,
    startedAt: events[0]!.timestamp,
    completedAt: events[events.length - 1]!.timestamp,
    events,
    proposals,
    policyEvaluations,
    gatewayResults,
    resourceChanges,
    finalReport,
    provenance,
  }
}
