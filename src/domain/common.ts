/**
 * ⚠️ PROVISIONAL — frontend-side working types, NOT the AegisAI backend contract.
 *
 * Everything in `src/domain` was written without access to the backend
 * repository. Field names, enumerations and shapes are best guesses that let
 * the UI be built and tested. They MUST be reconciled against the approved
 * backend contracts before integration (see docs/INTEGRATION.md). Security
 * semantics (what "allow", "deny" or "blocked" mean) belong to the backend and
 * must never be changed here to suit the UI.
 */

/** Marker string surfaced in docs/diagnostics so the status is never forgotten. */
export const CONTRACT_STATUS = 'PROVISIONAL' as const

/**
 * A known set of values that may be extended by the backend. The UI must
 * handle unknown values gracefully (render them verbatim, never assume a
 * meaning).
 */
export type Extensible<T extends string> = T | (string & {})

/** Which kind of system produced a record. Never mixed within one session. */
export type ExecutionSource = 'mock' | 'backend'

export type IsoTimestamp = string

/** Where a record came from, attached to every evidence-bearing record. */
export interface Provenance {
  source: ExecutionSource
  /** Identifier of the run / simulation that produced the record, if any. */
  runId?: string
}
