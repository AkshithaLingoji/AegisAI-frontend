import type { Extensible, IsoTimestamp, Provenance } from './common'

/**
 * Outcome of evaluating a proposed action. Decision vocabulary is owned by the
 * backend; unknown values must be displayed verbatim.
 * @provisional
 */
export interface PolicyEvaluation {
  id: string
  proposalId: string
  decision: Extensible<'allow' | 'deny' | 'require_approval' | 'defer' | 'escalate'>
  reasons: { code: string; message: string }[]
  policyRefs?: string[]
  evaluatedAt: IsoTimestamp
  provenance: Provenance
}

/**
 * What actually happened to a proposed action at the gateway.
 * @provisional
 */
export interface GatewayResult {
  id: string
  proposalId: string
  outcome: Extensible<'executed' | 'blocked' | 'modified' | 'error'>
  message?: string
  occurredAt: IsoTimestamp
  provenance: Provenance
}
