import type { ExecutionEvent, ExperimentResult, GatewayResult, RunRecord } from '@/domain'

/**
 * Compatibility mapper: derives the existing `ExperimentResult` view from the
 * canonical `RunRecord`, so the Command Center and Agent Operations keep working
 * unchanged. Only fields that `ExperimentResult` already had are produced; the
 * richer records (execution results, approvals, input snapshots …) are dropped.
 *
 * In the legacy shape a gateway outcome of `executed` meant "dispatched". New
 * code must read execution from `RunRecord.executionResults`, never from here.
 */
export function toExperimentResult(run: RunRecord): ExperimentResult {
  const provenance = { source: run.provenance.source, runId: run.id }
  const proposalById = new Map(run.proposals.map((p) => [p.id, p]))
  const decisionByProposal = new Map(run.decisions.map((d) => [d.proposalId, d]))
  const resolutionByProposal = new Map(
    run.approvalResolutions.flatMap((r) => {
      const req = run.approvalRequests.find((x) => x.id === r.requestId)
      return req ? [[req.proposalId, r] as const] : []
    }),
  )

  const events: ExecutionEvent[] = []
  let at = ''
  const push = (e: Pick<ExecutionEvent, 'kind' | 'summary'> & Partial<Pick<ExecutionEvent, 'refs' | 'payload'>>) => {
    const sequence = events.length + 1
    events.push({ ...e, id: `${run.id}-ev${sequence}`, runId: run.id, sequence, timestamp: at, provenance })
  }
  for (const ev of run.events) {
    const proposal = ev.proposalId ? proposalById.get(ev.proposalId) : undefined
    at = ev.at
    switch (ev.kind) {
      case 'task_received':
        push({ kind: 'task_received', summary: ev.message })
        break
      case 'proposed':
        push({ kind: 'action_proposed', summary: ev.message, refs: { proposalId: ev.proposalId, resourceId: ev.resourceId } })
        break
      case 'evaluated':
        push({ kind: 'policy_evaluated', summary: ev.message, refs: { proposalId: ev.proposalId, policyEvaluationId: ev.recordId } })
        break
      case 'dispatched':
      case 'blocked':
        push({
          kind: 'gateway_result',
          summary: `${ev.kind === 'dispatched' ? 'Executed' : 'Blocked'}: ${proposal?.summary ?? ''}`,
          refs: {
            proposalId: ev.proposalId,
            gatewayResultId: ev.recordId,
            policyEvaluationId: ev.proposalId ? decisionByProposal.get(ev.proposalId)?.id : undefined,
            resourceId: ev.resourceId,
          },
          ...(ev.payload ? { payload: ev.payload } : {}),
        })
        break
      case 'state_changed':
        push({ kind: 'resource_changed', summary: ev.message, refs: { resourceId: ev.resourceId } })
        break
      case 'report_generated':
        push({ kind: 'report_generated', summary: ev.message })
        break
      default:
        break // approval, execution events: not part of the legacy shape
    }
  }

  const legacyGateway = (g: GatewayResult): GatewayResult => {
    const dispatched = g.outcome === 'dispatched'
    const resolution = resolutionByProposal.get(g.proposalId)
    let message = g.message
    if (dispatched) {
      message =
        run.path.kind === 'baseline'
          ? 'Executed directly — this condition has no assurance layer.'
          : resolution
            ? 'Executed after an approved decision.'
            : 'Executed after an allow decision.'
    } else if (g.outcome === 'blocked') {
      message = resolution
        ? 'Blocked — approval rejected. Not executed. The resource was left unchanged.'
        : 'Blocked — not executed. The resource was left unchanged.'
    }
    return {
      id: g.id,
      proposalId: g.proposalId,
      outcome: dispatched ? 'executed' : g.outcome,
      message,
      occurredAt: g.occurredAt,
      provenance: g.provenance,
    }
  }

  return {
    id: `exp-${run.taskDefinitionId}-${run.path.kind}`,
    scenarioId: run.taskDefinitionId,
    condition: run.path.kind,
    runId: run.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? run.events[run.events.length - 1]!.at,
    events,
    proposals: run.proposals,
    policyEvaluations: run.decisions,
    gatewayResults: run.gatewayResults.map(legacyGateway),
    resourceChanges: run.stateChanges,
    ...(run.finalReport ? { finalReport: run.finalReport } : {}),
    provenance,
  }
}
