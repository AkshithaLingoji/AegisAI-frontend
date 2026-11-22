/**
 * ⚠️ PROVISIONAL — frontend-facing Red-Team Lab models, NOT the backend's schema.
 *
 * Written without access to the Red-Team backend's scenario schema. They are
 * shaped around its conceptual structure (scenario id, category, description,
 * input, expected behaviour) and keep five things apart on purpose:
 * scenario DEFINITION, execution REQUEST, execution STATUS (lifecycle),
 * attack OUTCOME (evaluation) and EVIDENCE. Backend-to-frontend translation
 * lives in `src/services/redTeam/mapping.ts`; components never see raw backend JSON.
 * See docs/RED-TEAM-LAB.md.
 */
import type { Extensible, IsoTimestamp, Provenance } from './common'

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * An attack category. Open on purpose: the id is data, so new categories need no UI
 * change. Unknown ids are shown verbatim.
 */
export interface ScenarioCategory {
  id: string
  label: string
  description?: string
}

/** What a scenario feeds the system under test. Never interpreted by the UI. */
export type ScenarioInput =
  | { format: 'text'; text: string }
  | { format: 'structured'; fields: Record<string, JsonValue> }

/** What the scenario expects a well-protected system to do. A statement, not a verdict. */
export interface ExpectedBehavior {
  summary: string
  details?: Record<string, JsonValue>
}

export interface ScenarioDefinition {
  id: string
  /** References a category by id; the category itself may or may not be known to the UI. */
  categoryId: string
  title?: string
  description: string
  input: ScenarioInput
  expectedBehavior: ExpectedBehavior
  provenance: Provenance
}

/** Asks for ONE scenario to be executed. It carries no outcome and promises no result. */
export interface ScenarioExecutionRequest {
  scenarioId: string
  /** Free-form run parameters, if the backend accepts any. Unconfirmed. */
  parameters?: Record<string, JsonValue>
}

/**
 * Where an execution is in its LIFECYCLE. This says nothing about whether the
 * attack succeeded: a `completed` execution can have a successful attack, and a
 * `failed` one means the test infrastructure failed.
 */
export type ExecutionLifecycle = 'pending' | 'running' | 'completed' | 'failed'
export const TERMINAL_LIFECYCLES: readonly ExecutionLifecycle[] = ['completed', 'failed']

export interface ScenarioExecutionStatus {
  executionId: string
  scenarioId: string
  lifecycle: ExecutionLifecycle
  requestedAt: IsoTimestamp
  startedAt?: IsoTimestamp
  finishedAt?: IsoTimestamp
  /** Set only for `failed`: why the execution itself failed. */
  failureReason?: string
  /** Whether a ScenarioResult can be fetched. A terminal status does not imply one. */
  resultAvailable: boolean
  provenance: Provenance
}

/** One finding about an attack. `unknown` is a real answer, not a missing field. */
export type Finding = 'yes' | 'no' | 'unknown'

/** The four independent evaluation findings. None implies another (an attack can be detected AND successful). */
export interface AttackEvaluation {
  attempted: Finding
  detected: Finding
  blocked: Finding
  successful: Finding
}

/**
 * The attack evaluation. Three mutually exclusive shapes keep the six concepts
 * (attempted, detected, blocked, successful, unknown, infrastructure failure)
 * from collapsing into one status field.
 */
export type AttackOutcome =
  | { status: 'evaluated'; evaluation: AttackEvaluation }
  /** The evaluator could not decide. Not a pass and not a fail. */
  | { status: 'unknown'; reason: string }
  /** The test harness failed, so the attack was not evaluated at all. */
  | { status: 'infrastructure_failure'; reason: string }

export interface EvidenceRecord {
  id: string
  /** Short label for the evidence; the kind is open (backend may add kinds). */
  kind: Extensible<'log' | 'trace' | 'tool_call' | 'output' | 'artifact'>
  summary: string
  recordedAt?: IsoTimestamp
  /** Opaque content reference or inline text; never interpreted by the UI. */
  content?: string
}

export interface ScenarioResult {
  executionId: string
  scenarioId: string
  outcome: AttackOutcome
  evidence: EvidenceRecord[]
  evaluatedAt?: IsoTimestamp
  provenance: Provenance
}

export interface ReportReference {
  id: string
  title: string
  /** Formats the backend can export; open. */
  formats: Extensible<'json' | 'markdown'>[]
  createdAt?: IsoTimestamp
  /** Executions covered by the report, if stated. */
  executionIds: string[]
  provenance: Provenance
}

/** A report ready to hand to the browser as a download. */
export interface ReportExport {
  reportId: string
  format: string
  filename: string
  mediaType: string
  content: string
}

/**
 * Whether the Red-Team subsystem is actually being served. `connected` is only
 * ever produced after the backend was reached; nothing here is inferred.
 */
export interface BackendConnectionStatus {
  state: 'mock' | 'connected' | 'not_connected' | 'unreachable'
  source: Provenance['source']
  /** Plain-language explanation shown in the UI. */
  detail: string
}
