import type { AuditRecord, ExperimentResult } from '@/domain'
import { scenarioFixtures } from './fixtures'
import { simulateRun, type Condition } from './simulate'

/** Fixed clock so every load produces byte-identical records. */
const BASE_MS = Date.UTC(2026, 2, 2, 9, 0, 0)
const RUN_SPACING_MS = 10 * 60 * 1000
const CONDITIONS: Condition[] = ['baseline', 'protected']

let cached: ExperimentResult[] | undefined

/** The seeded history: every scenario run under both conditions, in a fixed order. */
export function seededExperiments(): ExperimentResult[] {
  if (!cached) {
    let index = 0
    cached = scenarioFixtures.flatMap((fixture) =>
      CONDITIONS.map((condition) => simulateRun(fixture, condition, BASE_MS + index++ * RUN_SPACING_MS)),
    )
  }
  return cached
}

/** Audit records are derived from the recorded gateway results, not authored separately. */
export function deriveAuditRecords(experiments: ExperimentResult[]): AuditRecord[] {
  return experiments.flatMap((exp) =>
    exp.gatewayResults.map((gw) => {
      const proposal = exp.proposals.find((p) => p.id === gw.proposalId)!
      const evaluation = exp.policyEvaluations.find((pe) => pe.proposalId === gw.proposalId)
      return {
        id: `audit-${gw.id}`,
        timestamp: gw.occurredAt,
        runId: exp.runId,
        principalId: proposal.agentId,
        action: `${proposal.kind}: ${proposal.summary}`,
        resourceId: proposal.targetResourceId,
        decision: evaluation ? String(evaluation.decision) : 'not evaluated (no assurance layer)',
        outcome: String(gw.outcome),
        evidenceRefs: [proposal.id, ...(evaluation ? [evaluation.id] : []), gw.id],
        provenance: gw.provenance,
      }
    }),
  )
}
