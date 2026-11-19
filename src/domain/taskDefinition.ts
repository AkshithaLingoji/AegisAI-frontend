import type { Extensible } from './common'

/**
 * How much an input is trusted. User-provided and retrieved content is
 * `untrusted` by default and is never promoted by the UI. `declared-trusted` can
 * only be assigned by built-in catalogue data and means "declared trusted by the
 * demonstration data" — it is not a verdict that the content is safe.
 * @provisional
 */
export interface TrustMetadata {
  level: 'untrusted' | 'declared-trusted'
  assignedBy: 'default' | 'catalogue'
  reason: string
}

/**
 * An input as CONFIGURED on a task definition. Editable until a run starts.
 * A run keeps an immutable `RunInputSnapshot` of exactly what the agent received.
 * @provisional
 */
export interface TaskInput {
  id: string
  label: string
  format: 'text' | 'csv' | 'json'
  /** Kept exactly as provided: never trimmed, normalised or truncated. */
  content: string
  trust: TrustMetadata
}

/**
 * A reusable task, shared by predefined catalogue entries and custom tasks.
 * Domain-independent: `domain` is a free label. Simulation-only behaviour is NOT
 * part of this contract (see the mock engine's simulation profiles).
 * @provisional
 */
export interface TaskDefinition {
  id: string
  origin: 'catalogue' | 'custom'
  domain: Extensible<string>
  title: string
  summary: string
  /** The request exactly as the user phrased it. */
  request: string
  agentId: string
  /** The simulated acting identity. Authentication is not implemented. */
  actingPrincipalId: string
  declaredIntent?: { resourceIds: string[]; actionKinds: string[] }
  selectedResourceIds: string[]
  inputs: TaskInput[]
  tags?: string[]
}
