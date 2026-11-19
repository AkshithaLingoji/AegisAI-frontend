/**
 * Generic deterministic runner (mock only).
 *
 * DEMONSTRATION LOGIC: the evaluation is the same simple demonstration rules as
 * before (plus an authored approval route). It is not a policy engine, gateway
 * or authorisation layer, and its output is never backend security evidence.
 *
 * `runTask` produces the canonical `RunRecord`. Proposals, decisions, gateway
 * results and execution results are recorded separately. Each run starts from a
 * fresh clone of the deterministic initial sandbox, so runs are isolated.
 */
import type {
  ActionProposal,
  AuthenticatedPrincipal,
  ExecutionPathKind,
  ExecutionResult,
  GatewayResult,
  PolicyEvaluation,
  ResourceStateChange,
  RunEvent,
  RunGroup,
  RunRecord,
  TaskDefinition,
} from '@/domain'
import { canonicalize, digestCanonical, digestsEqual } from '@/lib/runs/canonical'
import { InputValidationError, computeInputsDigest, snapshotInputs } from '@/lib/runs/inputs'
import { agents, initialSandbox, principals, type PlannedAction, type Sandbox } from '../fixtures'
import { applyAction, clone, evaluateDemoRules, STEP_MS } from '../simulate'
import { catalogueEntries, type SimulationProfile } from './profiles'

export class ApprovalError extends Error {
  constructor(
    readonly code: 'unknown-request' | 'already-resolved' | 'profile-mismatch' | 'time-before-history',
    message: string,
  ) {
    super(message)
    this.name = code === 'already-resolved' ? 'ApprovalAlreadyResolvedError' : 'ApprovalError'
  }
}

export interface RunTaskOptions {
  /** Unique run ID, chosen by the caller (the future run service guarantees uniqueness). */
  runId: string
  path: ExecutionPathKind
  /** Start of the simulated clock. Events are fixed offsets from it: no randomness. */
  startMs: number
  profile: SimulationProfile
  groupId?: string
}

interface Draft {
  runId: string
  agentId: string
  agentName: string
  principal: AuthenticatedPrincipal
  profile: SimulationProfile
  taskId: string
  proposals: ActionProposal[]
  decisions: PolicyEvaluation[]
  approvalRequests: RunRecord['approvalRequests']
  path: ExecutionPathKind
  provenance: { source: 'mock'; runId: string }
  events: RunEvent[]
  gatewayResults: GatewayResult[]
  executionResults: ExecutionResult[]
  sandbox: Sandbox
  readSoFar: string[]
  retrieved: Record<string, string>
  at: () => string
}

const pushEvent = (d: Draft, e: Omit<RunEvent, 'id' | 'seq' | 'at'>, at?: string) => {
  const seq = d.events.length + 1
  d.events.push({ id: `${d.runId}-e${seq}`, seq, at: at ?? d.at(), ...e })
}

const asPlanned = (p: ActionProposal): PlannedAction => ({
  kind: p.kind as PlannedAction['kind'],
  targetResourceId: p.targetResourceId,
  summary: p.summary,
  parameters: p.parameters,
  rationale: p.rationale ?? '',
})

type DispatchCause = 'no-assurance-layer' | 'allow-decision' | 'approval-granted'
type BlockCause = 'deny-decision' | 'approval-rejected'

const DISPATCH_MESSAGE: Record<DispatchCause, string> = {
  'no-assurance-layer': 'Dispatched directly — this path has no assurance layer.',
  'allow-decision': 'Dispatched after an allow decision.',
  'approval-granted': 'Dispatched after the simulated approval was granted.',
}
const BLOCK_MESSAGE: Record<BlockCause, string> = {
  'deny-decision': 'Blocked — not dispatched. The resource was left unchanged.',
  'approval-rejected': 'Blocked — the simulated approval was rejected. The resource was left unchanged.',
}

/** Records the gateway outcome and, separately, whether the action actually ran. */
function settle(d: Draft, proposal: ActionProposal, outcome: { dispatch: DispatchCause } | { block: BlockCause }) {
  const n = proposal.sequence
  const dispatch = 'dispatch' in outcome
  const gateway: GatewayResult = {
    id: `${d.runId}-gw${n}`,
    proposalId: proposal.id,
    outcome: dispatch ? 'dispatched' : 'blocked',
    message: dispatch ? DISPATCH_MESSAGE[outcome.dispatch] : BLOCK_MESSAGE[(outcome as { block: BlockCause }).block],
    occurredAt: d.at(),
    provenance: d.provenance,
  }
  d.gatewayResults.push(gateway)
  const retrieved = dispatch && proposal.kind === 'read' ? d.retrieved[proposal.targetResourceId] : undefined
  const stepAt = d.at()
  pushEvent(
    d,
    {
      kind: dispatch ? 'dispatched' : 'blocked',
      message: `${dispatch ? 'Dispatched' : 'Blocked'}: ${proposal.summary}`,
      proposalId: proposal.id,
      recordId: gateway.id,
      resourceId: proposal.targetResourceId,
      ...(retrieved ? { payload: { retrievedContent: retrieved } } : {}),
    },
    stepAt,
  )

  // Execution is its own record and event. It shares the dispatch step's timestamp
  // (one simulated step); ordering is given by `seq`.
  let status: ExecutionResult['status']
  let detail: string
  let changed = false
  if (!dispatch) {
    status = 'not_run'
    detail = 'Not run: the gateway blocked this action, so the resource was not touched.'
  } else if (!d.sandbox[proposal.targetResourceId]) {
    status = 'failed'
    detail = 'Failed: the resource was not found in the simulated sandbox.'
  } else {
    const prev = clone(d.sandbox[proposal.targetResourceId])
    applyAction(asPlanned(proposal), d.sandbox, d.agentName, d.readSoFar)
    changed = JSON.stringify(prev) !== JSON.stringify(d.sandbox[proposal.targetResourceId])
    status = 'ran'
    detail = 'Simulated execution completed.'
  }
  const execution: ExecutionResult = {
    id: `${d.runId}-ex${n}`,
    proposalId: proposal.id,
    status,
    detail,
    occurredAt: stepAt,
    provenance: d.provenance,
  }
  d.executionResults.push(execution)
  pushEvent(
    d,
    {
      kind: status === 'ran' ? 'executed' : status === 'failed' ? 'execution_failed' : 'not_run',
      message: `${status === 'ran' ? 'Ran' : status === 'failed' ? 'Failed' : 'Not run'}: ${proposal.summary}`,
      proposalId: proposal.id,
      recordId: execution.id,
      resourceId: proposal.targetResourceId,
    },
    stepAt,
  )
  if (changed) {
    pushEvent(d, {
      kind: 'state_changed',
      message: `Resource updated: ${proposal.targetResourceId}`,
      proposalId: proposal.id,
      resourceId: proposal.targetResourceId,
    })
  }
}

const stateChanges = (initial: RunRecord['initialState']['resources'], sandbox: Sandbox, ids: string[]): ResourceStateChange[] =>
  ids.map((id) => ({ resourceId: id, before: clone(initial[id] ?? null), after: clone(sandbox[id] ?? null) }))

const finalReportText = (agentName: string, executions: ExecutionResult[], proposalCount: number) =>
  `${agentName} finished. ${executions.filter((x) => x.status === 'ran').length} of ${proposalCount} proposed actions ran.`

/**
 * Ordered, sequential agent. Runs plan positions `from`.. in order. When a
 * simulated rule routes an action to human approval, an immutable request is
 * recorded and the run PAUSES there: later actions are not proposed, evaluated or
 * run until the request is resolved, so nothing that follows can observe state
 * the awaiting action has not yet produced. `resolveApproval` resumes from the
 * next position, whether the action was approved or rejected.
 */
function processPlan(d: Draft, from: number): void {
  for (let index = from; index < d.profile.plan.length; index++) {
    const planned = d.profile.plan[index]!
    const n = index + 1
    const proposal: ActionProposal = {
      id: `${d.runId}-p${n}`,
      taskId: d.taskId,
      agentId: d.agentId,
      sequence: n,
      kind: planned.kind,
      targetResourceId: planned.targetResourceId,
      summary: planned.summary,
      parameters: clone(planned.parameters),
      rationale: planned.rationale,
    }
    d.proposals.push(proposal)
    pushEvent(d, {
      kind: 'proposed',
      message: `${d.agentName} proposed: ${planned.summary}`,
      proposalId: proposal.id,
      resourceId: planned.targetResourceId,
    })

    if (d.path === 'baseline') {
      settle(d, proposal, { dispatch: 'no-assurance-layer' })
      continue
    }

    const rules = evaluateDemoRules(planned, d.principal)
    const needsApproval = rules.decision === 'allow' && (d.profile.approvalRequiredActions ?? []).includes(index)
    const decision: PolicyEvaluation = {
      id: `${d.runId}-pe${n}`,
      proposalId: proposal.id,
      decision: needsApproval ? 'require_approval' : rules.decision,
      reasons: needsApproval
        ? [{ code: 'APPROVAL_REQUIRED_SIMULATED', message: 'A simulated rule requires a human to approve this action before it is dispatched.' }]
        : rules.reasons,
      policyRefs: needsApproval ? ['demo-rule/approval-required'] : rules.policyRefs,
      evaluatedAt: d.at(),
      provenance: d.provenance,
    }
    d.decisions.push(decision)
    pushEvent(d, {
      kind: 'evaluated',
      message: `Demonstration rules ${needsApproval ? 'require approval for' : rules.decision === 'allow' ? 'allowed' : 'denied'}: ${planned.summary}`,
      proposalId: proposal.id,
      recordId: decision.id,
    })

    if (needsApproval) {
      const request = {
        id: `${d.runId}-ar${n}`,
        proposalId: proposal.id,
        decisionId: decision.id,
        requestedAt: d.at(),
        reason: decision.reasons[0]!.message,
        simulated: true as const,
      }
      d.approvalRequests.push(request)
      pushEvent(d, {
        kind: 'approval_requested',
        message: `Simulated approval requested: ${planned.summary}`,
        proposalId: proposal.id,
        recordId: request.id,
      })
      return // PAUSE: the simulated agent does not continue until this is resolved
    }
    settle(d, proposal, rules.decision === 'allow' ? { dispatch: 'allow-decision' } : { block: 'deny-decision' })
  }
}

/**
 * Trust enforcement. Custom (user-provided) tasks can never claim
 * `declared-trusted` or `assignedBy: 'catalogue'`, and a task cannot simply label
 * itself `catalogue`: it must be one of the controlled catalogue definitions and
 * carry exactly that definition's inputs. Throws instead of silently correcting.
 */
function assertInputOrigin(task: TaskDefinition): void {
  if (task.origin === 'catalogue') {
    const known = catalogueEntries().find((e) => e.task.id === task.id)
    if (!known) throw new InputValidationError([`Task “${task.id}” claims catalogue origin but is not a controlled catalogue definition.`])
    if (canonicalize(task.inputs) !== canonicalize(known.task.inputs)) {
      throw new InputValidationError([`Catalogue task “${task.id}” inputs differ from the controlled catalogue definition.`])
    }
  }
}

/** Runs one task along one execution path. Pure: same inputs always give the same record. */
export function runTask(task: TaskDefinition, { runId, path, startMs, profile, groupId }: RunTaskOptions): RunRecord {
  const agent = agents.find((a) => a.id === task.agentId)
  if (!agent) throw new Error(`Unknown agent “${task.agentId}”`)
  const principal = principals.find((p) => p.id === task.actingPrincipalId)
  if (!principal) throw new Error(`Unknown simulated acting identity “${task.actingPrincipalId}”`)

  assertInputOrigin(task)
  const inputs = snapshotInputs(task.inputs, task.origin) // throws; never truncates or escalates trust
  const sandbox = initialSandbox()
  const initialResources = clone(sandbox)
  const provenance = { source: 'mock' as const, runId }

  let tick = 0
  const d: Draft = {
    runId,
    agentId: agent.id,
    agentName: agent.name,
    principal,
    profile,
    taskId: profile.taskId ?? `task-${task.id}`,
    proposals: [],
    decisions: [],
    approvalRequests: [],
    path,
    provenance,
    events: [],
    gatewayResults: [],
    executionResults: [],
    sandbox,
    readSoFar: [],
    retrieved: profile.retrievedContent,
    at: () => new Date(startMs + tick++ * STEP_MS).toISOString(),
  }

  pushEvent(d, { kind: 'task_received', message: `Task received: “${task.request}”` })
  processPlan(d, 0)

  const observedResourceIds = [...profile.observedResourceIds]
  const awaiting = hasPendingApproval(d.approvalRequests, [])
  let finalReport: string | undefined
  if (!awaiting) {
    finalReport = finalReportText(d.agentName, d.executionResults, d.proposals.length)
    pushEvent(d, { kind: 'report_generated', message: finalReport })
  }

  return {
    id: runId,
    revision: 1,
    taskDefinitionId: task.id,
    task: clone(task),
    agent: { id: agent.id, name: agent.name },
    path: { kind: path, assuranceLayer: path === 'protected' ? 'applied' : 'absent' },
    ...(groupId ? { groupId } : {}),
    actingPrincipalId: task.actingPrincipalId,
    status: awaiting ? 'awaiting_approval' : 'completed',
    startedAt: d.events[0]!.at,
    ...(awaiting ? {} : { completedAt: d.events[d.events.length - 1]!.at }),
    initialState: { resources: initialResources, digest: digestCanonical(initialResources) },
    inputs,
    inputsDigest: computeInputsDigest(inputs),
    proposals: d.proposals,
    decisions: d.decisions,
    approvalRequests: d.approvalRequests,
    approvalResolutions: [],
    gatewayResults: d.gatewayResults,
    executionResults: d.executionResults,
    observedResourceIds,
    stateChanges: stateChanges(initialResources, sandbox, observedResourceIds),
    events: d.events,
    ...(finalReport ? { finalReport } : {}),
    provenance: {
      ...provenance,
      simulation: { profileId: profile.id, profileLabel: profile.label, profileDigest: digestCanonical(profile), requestInterpreted: false },
    },
  }
}

const hasPendingApproval = (requests: RunRecord['approvalRequests'], resolutions: RunRecord['approvalResolutions']) =>
  requests.some((r) => !resolutions.some((x) => x.requestId === r.id))

export interface RunPair {
  group: RunGroup
  baseline: RunRecord
  protected: RunRecord
}

export interface RunPairOptions {
  /** Run ids become `${idBase}-baseline` and `${idBase}-protected`. */
  idBase: string
  baselineStartMs: number
  protectedStartMs: number
  profile: SimulationProfile
}

/** Runs the same task on both paths, each from its own fresh clone of the same initial sandbox. */
export function runTaskPair(task: TaskDefinition, { idBase, baselineStartMs, protectedStartMs, profile }: RunPairOptions): RunPair {
  const groupId = `group-${idBase}`
  const baseline = runTask(task, { runId: `${idBase}-baseline`, path: 'baseline', startMs: baselineStartMs, profile, groupId })
  const protectedRun = runTask(task, { runId: `${idBase}-protected`, path: 'protected', startMs: protectedStartMs, profile, groupId })
  return {
    group: {
      id: groupId,
      taskDefinitionId: task.id,
      baselineRunId: baseline.id,
      protectedRunId: protectedRun.id,
      initialStateDigest: baseline.initialState.digest,
      inputsDigest: baseline.inputsDigest,
      createdAt: baseline.startedAt,
      provenance: { source: 'mock', runId: groupId },
    },
    baseline,
    protected: protectedRun,
  }
}

export interface ResolveApprovalOptions {
  /** Start of the simulated clock for the records this resolution appends. Must not precede the run's last event. */
  nowMs: number
  note?: string
  /** The profile the run was started with: the paused run continues with the rest of its plan. */
  profile: SimulationProfile
}

/**
 * Resolves the pending approval request by APPENDING records, then RESUMES the
 * paused simulated agent with the remaining plan, in order. The request, every
 * earlier record and every earlier event stay exactly as they were; the input run
 * is not modified. Resolving the same request twice throws.
 *
 * Ordering: the awaiting action is settled (dispatched and run, or blocked and not
 * run) BEFORE any later action is proposed. After either outcome the simulated
 * agent continues; a rejected action simply has no effect on later state.
 */
export function resolveApproval(
  run: RunRecord,
  requestId: string,
  outcome: 'approved' | 'rejected',
  { nowMs, note, profile }: ResolveApprovalOptions,
): RunRecord {
  const request = run.approvalRequests.find((r) => r.id === requestId)
  if (!request) throw new ApprovalError('unknown-request', `No approval request “${requestId}” in run “${run.id}”.`)
  if (run.approvalResolutions.some((r) => r.requestId === requestId)) {
    throw new ApprovalError('already-resolved', `Approval request “${requestId}” has already been resolved.`)
  }
  // Identity is proven by the digest of the COMPLETE profile, never by its id alone.
  const recorded = run.provenance.simulation
  if (!recorded || recorded.profileId !== profile.id || !digestsEqual(recorded.profileDigest, digestCanonical(profile))) {
    throw new ApprovalError('profile-mismatch', `The supplied simulation profile is not the one run “${run.id}” was started with (its digest differs).`)
  }
  const lastEventMs = Date.parse(run.events[run.events.length - 1]!.at)
  if (nowMs < lastEventMs) {
    throw new ApprovalError('time-before-history', 'The resolution time precedes the run’s last recorded event; history is append-only.')
  }
  const proposal = run.proposals.find((p) => p.id === request.proposalId)!
  const principal = principals.find((p) => p.id === run.actingPrincipalId)!

  const next = clone(run)
  // Rebuild the simulated sandbox by replaying what already ran, in the order it ran.
  const sandbox = clone(run.initialState.resources) as Sandbox
  const readSoFar: string[] = []
  for (const gw of run.gatewayResults) {
    const exec = run.executionResults.find((x) => x.proposalId === gw.proposalId)
    const p = run.proposals.find((x) => x.id === gw.proposalId)
    if (exec?.status === 'ran' && p) applyAction(asPlanned(p), sandbox, run.agent.name, readSoFar)
  }

  let tick = 0
  const d: Draft = {
    runId: run.id,
    agentId: run.agent.id,
    agentName: run.agent.name,
    principal,
    profile,
    taskId: next.proposals[0]?.taskId ?? `task-${run.taskDefinitionId}`,
    proposals: next.proposals,
    decisions: next.decisions,
    approvalRequests: next.approvalRequests,
    path: run.path.kind,
    provenance: { source: 'mock' as const, runId: run.id },
    events: next.events,
    gatewayResults: next.gatewayResults,
    executionResults: next.executionResults,
    sandbox,
    readSoFar,
    retrieved: profile.retrievedContent,
    at: () => new Date(nowMs + tick++ * STEP_MS).toISOString(),
  }

  const resolvedAt = d.at()
  const resolution = {
    id: `${run.id}-ares${proposal.sequence}`,
    requestId,
    outcome,
    resolvedAt,
    ...(note ? { note } : {}),
    simulated: true as const,
  }
  next.approvalResolutions.push(resolution)
  pushEvent(
    d,
    {
      kind: 'approval_resolved',
      message: `Simulated approval ${outcome === 'approved' ? 'granted' : 'rejected'}: ${proposal.summary}`,
      proposalId: proposal.id,
      recordId: resolution.id,
    },
    resolvedAt,
  )
  settle(d, proposal, outcome === 'approved' ? { dispatch: 'approval-granted' } : { block: 'approval-rejected' })
  // Resume: only now does the simulated agent move on to the next planned action.
  processPlan(d, proposal.sequence)

  next.revision = run.revision + 1
  next.stateChanges = stateChanges(run.initialState.resources, sandbox, run.observedResourceIds)
  const stillPending = hasPendingApproval(next.approvalRequests, next.approvalResolutions)
  next.status = stillPending ? 'awaiting_approval' : 'completed'
  if (!stillPending) {
    next.finalReport = finalReportText(run.agent.name, next.executionResults, next.proposals.length)
    pushEvent(d, { kind: 'report_generated', message: next.finalReport })
    next.completedAt = next.events[next.events.length - 1]!.at
  }
  return next
}
