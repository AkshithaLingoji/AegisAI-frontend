import type { Digest, RunGroup, RunRecord } from '@/domain'
import { canonicalize, digestCanonical, digestsEqual, digestText } from './canonical'
import { computeInputsDigest } from './inputs'

/**
 * What happened to ONE proposal, as separate facts. Nothing here implies another:
 * a decision of ALLOW does not mean it ran, and BLOCKED is not "verified prevention".
 */
export interface ProposalOutcome {
  proposalId: string
  /** Recorded decision as written (`null` when the path has no assurance layer). */
  decision: string | null
  approval: 'not_required' | 'pending' | 'approved' | 'rejected'
  /** Recorded gateway outcome as written (`null` when nothing reached the gateway). */
  gateway: string | null
  /** Recorded execution status (`null` when no execution has been recorded). */
  execution: 'ran' | 'not_run' | 'failed' | null
  /** Whether a state change event was recorded for this proposal. */
  stateChanged: boolean
}

export function deriveProposalOutcome(run: RunRecord, proposalId: string): ProposalOutcome {
  const request = run.approvalRequests.find((r) => r.proposalId === proposalId)
  const resolution = request ? run.approvalResolutions.find((r) => r.requestId === request.id) : undefined
  return {
    proposalId,
    decision: run.decisions.find((d) => d.proposalId === proposalId)?.decision ?? null,
    approval: !request ? 'not_required' : (resolution?.outcome ?? 'pending'),
    gateway: run.gatewayResults.find((g) => g.proposalId === proposalId)?.outcome ?? null,
    execution: run.executionResults.find((x) => x.proposalId === proposalId)?.status ?? null,
    stateChanged: run.events.some((e) => e.kind === 'state_changed' && e.proposalId === proposalId),
  }
}

export interface ComparisonRow {
  sequence: number
  summary: string
  baseline: ProposalOutcome
  protected: ProposalOutcome
}

export type RunComparison =
  | { comparable: false; reasons: string[] }
  | {
      comparable: true
      rows: ComparisonRow[]
      /** Every figure below is counted from the two recorded runs. */
      totals: {
        proposals: number
        baselineRan: number
        protectedRan: number
        protectedBlocked: number
      }
      /** Resources whose recorded final state differs between the two runs. */
      resourcesWithDifferentFinalState: string[]
    }

const sameDigest = (a: Digest, b: Digest) => digestsEqual(a, b)

/** Checks a run's recorded digests against its own recorded content. */
function evidenceIssues(label: string, run: RunRecord): string[] {
  const out: string[] = []
  if (!digestsEqual(digestCanonical(run.initialState.resources), run.initialState.digest)) out.push(`${label} run: recorded initial-state digest does not match its recorded initial state.`)
  if (run.inputs.some((i) => !digestsEqual(digestText(i.content), i.contentDigest)) || !digestsEqual(computeInputsDigest(run.inputs), run.inputsDigest)) {
    out.push(`${label} run: recorded inputs digest does not match its recorded inputs.`)
  }
  return out
}

/** Every execution-relevant field of a proposal, in canonical form. */
const proposalKey = (p: RunRecord['proposals'][number]) =>
  canonicalize({ sequence: p.sequence, kind: p.kind, targetResourceId: p.targetResourceId, summary: p.summary, parameters: p.parameters, agentId: p.agentId })

/**
 * Compares a Baseline and a Protected run. Refuses (returns `comparable: false`)
 * unless the group evidence matches BOTH actual runs (initial-state and inputs
 * digests, recomputed from the records), both runs started from identical state
 * with equivalent inputs for the same task, acting identity and agent, both are
 * complete, and they proposed identical actions (sequence, kind, target, summary,
 * parameters).
 */
export function deriveComparison(group: RunGroup, baseline: RunRecord, protectedRun: RunRecord): RunComparison {
  const reasons: string[] = []
  if (group.baselineRunId !== baseline.id || group.protectedRunId !== protectedRun.id) reasons.push('The runs do not belong to this group.')
  if (baseline.path.kind !== 'baseline' || protectedRun.path.kind !== 'protected') reasons.push('The runs are not a Baseline and a Protected path.')
  if (baseline.taskDefinitionId !== protectedRun.taskDefinitionId || group.taskDefinitionId !== baseline.taskDefinitionId) reasons.push('The runs are for different tasks.')
  if (baseline.actingPrincipalId !== protectedRun.actingPrincipalId || baseline.agent.id !== protectedRun.agent.id) reasons.push('The runs used a different agent or simulated acting identity.')
  reasons.push(...evidenceIssues('Baseline', baseline), ...evidenceIssues('Protected', protectedRun))
  if (!sameDigest(group.initialStateDigest, baseline.initialState.digest) || !sameDigest(group.initialStateDigest, protectedRun.initialState.digest)) {
    reasons.push('The group’s initial-state digest does not match both runs.')
  }
  if (!sameDigest(group.inputsDigest, baseline.inputsDigest) || !sameDigest(group.inputsDigest, protectedRun.inputsDigest)) {
    reasons.push('The group’s inputs digest does not match both runs.')
  }
  if (!sameDigest(baseline.initialState.digest, protectedRun.initialState.digest)) reasons.push('The runs did not start from identical initial state.')
  if (!sameDigest(baseline.inputsDigest, protectedRun.inputsDigest)) reasons.push('The runs did not receive equivalent inputs.')
  if (baseline.status !== 'completed' || protectedRun.status !== 'completed') reasons.push('A run has not completed (for example it is awaiting approval), so it cannot be compared yet.')
  const samePlan =
    baseline.proposals.length === protectedRun.proposals.length &&
    baseline.proposals.every((p, i) => proposalKey(p) === proposalKey(protectedRun.proposals[i]!))
  if (!samePlan) reasons.push('The runs did not propose the same actions.')
  if (reasons.length > 0) return { comparable: false, reasons }

  const rows = baseline.proposals.map((p, i) => ({
    sequence: p.sequence,
    summary: p.summary,
    baseline: deriveProposalOutcome(baseline, p.id),
    protected: deriveProposalOutcome(protectedRun, protectedRun.proposals[i]!.id),
  }))
  const ids = [...new Set([...baseline.stateChanges, ...protectedRun.stateChanges].map((c) => c.resourceId))]
  const finalState = (run: RunRecord, id: string) => canonicalize(run.stateChanges.find((c) => c.resourceId === id)?.after ?? null)
  return {
    comparable: true,
    rows,
    totals: {
      proposals: rows.length,
      baselineRan: rows.filter((r) => r.baseline.execution === 'ran').length,
      protectedRan: rows.filter((r) => r.protected.execution === 'ran').length,
      protectedBlocked: rows.filter((r) => r.protected.gateway === 'blocked').length,
    },
    resourcesWithDifferentFinalState: ids.filter((id) => finalState(baseline, id) !== finalState(protectedRun, id)),
  }
}
