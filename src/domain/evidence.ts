import type { Extensible, IsoTimestamp, Provenance } from './common'

/** One step in an execution timeline.
 * @provisional */
export interface ExecutionEvent {
  id: string
  runId: string
  /** Monotonic position within the run. */
  sequence: number
  timestamp: IsoTimestamp
  kind: Extensible<
    | 'task_received'
    | 'action_proposed'
    | 'policy_evaluated'
    | 'gateway_result'
    | 'resource_changed'
    | 'report_generated'
  >
  summary: string
  refs?: {
    proposalId?: string
    policyEvaluationId?: string
    gatewayResultId?: string
    resourceId?: string
  }
  payload?: Record<string, unknown>
  provenance: Provenance
}

/** @provisional */
export interface AuditRecord {
  id: string
  timestamp: IsoTimestamp
  runId?: string
  principalId: string
  action: string
  resourceId?: string
  decision?: string
  outcome?: string
  evidenceRefs?: string[]
  provenance: Provenance
}
