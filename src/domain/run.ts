import type { IsoTimestamp, Provenance } from './common'
import type { GatewayResult, PolicyEvaluation } from './enforcement'
import type { ResourceStateChange } from './experiment'
import type { ActionProposal } from './task'
import type { TaskDefinition, TaskInput, TrustMetadata } from './taskDefinition'

/**
 * Canonical generic run model (PROVISIONAL). `ExperimentResult` is a derived
 * compatibility view: see `toExperimentResult` in `src/lib/runs`.
 *
 * Four things are always separate records and never merged:
 *   1. what the agent PROPOSED              -> `proposals`
 *   2. what AegisAI DECIDED                 -> `decisions`
 *   3. what the gateway DID (dispatch/block) -> `gatewayResults`
 *   4. what actually RAN on the resource    -> `executionResults`
 * ALLOW is never proof of execution. The run `status` only describes progress,
 * not whether actions succeeded.
 */

export type ExecutionPathKind = 'baseline' | 'protected'

/** Digests are SHA-256. The algorithm is recorded so it can never be assumed. */
export type DigestAlgorithm = 'sha-256'
export interface Digest {
  algorithm: DigestAlgorithm
  /** Lower-case hexadecimal. */
  hex: string
}

/** @provisional */
export interface StateSnapshot {
  resources: Record<string, Record<string, unknown>>
  /** SHA-256 of the canonical serialisation of `resources`. */
  digest: Digest
}

/**
 * Immutable record of exactly what the simulated agent received for one input.
 * Created at run start; never edited afterwards.
 * @provisional
 */
export interface RunInputSnapshot {
  inputId: string
  label: string
  format: TaskInput['format']
  /** Exact content, byte-for-byte as configured (UTF-8, no trimming or normalising). */
  content: string
  byteLength: number
  /** SHA-256 of the UTF-8 bytes of `content`. */
  contentDigest: Digest
  trust: TrustMetadata
}

/** Whether an action actually ran. Independent of the run status.
 * @provisional */
export interface ExecutionResult {
  id: string
  proposalId: string
  status: 'ran' | 'not_run' | 'failed'
  detail?: string
  occurredAt: IsoTimestamp
  provenance: Provenance
}

/** Immutable once written. Whether it is still pending is derived, never stored.
 * @provisional */
export interface ApprovalRequest {
  id: string
  proposalId: string
  decisionId: string
  requestedAt: IsoTimestamp
  reason: string
  /** The approval step is simulated; there is no real approver. */
  simulated: true
}

/** Appended separately when a request is resolved. The request is never edited.
 * @provisional */
export interface ApprovalResolution {
  id: string
  requestId: string
  outcome: 'approved' | 'rejected'
  resolvedAt: IsoTimestamp
  note?: string
  simulated: true
}

export type RunEventKind =
  | 'task_received'
  | 'proposed'
  | 'evaluated'
  | 'approval_requested'
  | 'approval_resolved'
  | 'dispatched'
  | 'blocked'
  | 'executed'
  | 'not_run'
  | 'execution_failed'
  | 'state_changed'
  | 'report_generated'

/** One simulation event. Append-only; positions never change.
 * @provisional */
export interface RunEvent {
  id: string
  /** Monotonic position within the run (1-based). */
  seq: number
  at: IsoTimestamp
  kind: RunEventKind
  message: string
  proposalId?: string
  /** Id of the record this event is about (decision, request, gateway result ...). */
  recordId?: string
  resourceId?: string
  payload?: Record<string, unknown>
}

/** Development-only note about how a mock run was produced.
 * @provisional */
export interface SimulationNote {
  profileId: string
  profileLabel: string
  /** SHA-256 of the complete profile (canonical form) the run was started with; used to prove a resumed run continues with the same profile. */
  profileDigest: Digest
  /** The mock never interprets the request text. */
  requestInterpreted: false
}

/** @provisional */
export interface RunRecord {
  /** Unique run ID. */
  id: string
  /** Increases by one each time records are appended (e.g. an approval is resolved). */
  revision: number
  taskDefinitionId: string
  /** Frozen copy of the definition at start time (request kept verbatim). */
  task: TaskDefinition
  agent: { id: string; name: string }
  path: { kind: ExecutionPathKind; assuranceLayer: 'absent' | 'applied' }
  /** Links a Baseline/Protected pair. */
  groupId?: string
  /** The simulated acting identity. */
  actingPrincipalId: string
  /** Progress only. A completed run may contain failed or not-run actions. */
  status: 'awaiting_approval' | 'completed'
  startedAt: IsoTimestamp
  completedAt?: IsoTimestamp
  initialState: StateSnapshot
  /** Immutable snapshots of what the agent received. */
  inputs: RunInputSnapshot[]
  /** SHA-256 over the canonical list of input ids, formats, content digests and trust. */
  inputsDigest: Digest
  proposals: ActionProposal[]
  decisions: PolicyEvaluation[]
  approvalRequests: ApprovalRequest[]
  approvalResolutions: ApprovalResolution[]
  gatewayResults: GatewayResult[]
  executionResults: ExecutionResult[]
  /** Resources reported on, as of this revision. */
  observedResourceIds: string[]
  stateChanges: ResourceStateChange[]
  events: RunEvent[]
  finalReport?: string
  provenance: Provenance & { simulation?: SimulationNote }
}

/** Links the Baseline and Protected runs of one task.
 * @provisional */
export interface RunGroup {
  id: string
  taskDefinitionId: string
  baselineRunId: string
  protectedRunId: string
  initialStateDigest: Digest
  inputsDigest: Digest
  createdAt: IsoTimestamp
  provenance: Provenance
}
