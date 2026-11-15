import type { Extensible, IsoTimestamp } from './common'

/** @provisional */
export interface UserTask {
  id: string
  agentId: string
  principalId: string
  /** The request exactly as the user phrased it. */
  prompt: string
  scenarioId?: string
  submittedAt: IsoTimestamp
  /**
   * What the request actually concerns, as annotated by the demonstration data.
   * Used only to show whether a proposed action matches the request. Omitted when
   * the request does not say.
   */
  intent?: { resourceIds: string[]; actionKinds: string[] }
}

/** An action the agent wants to take. Proposed, not yet permitted.
 * @provisional */
export interface ActionProposal {
  id: string
  taskId: string
  agentId: string
  /** Order in which the agent proposed it within the run. */
  sequence: number
  kind: Extensible<'read' | 'write' | 'export' | 'send' | 'delete'>
  targetResourceId: string
  summary: string
  parameters: Record<string, unknown>
  rationale?: string
}

/** @provisional */
export interface ResourceMetadata {
  id: string
  name: string
  kind: Extensible<'dataset' | 'document' | 'table' | 'patient-record'>
  domain: Extensible<'finance' | 'health'>
  sensitivity?: Extensible<'public' | 'internal' | 'confidential' | 'restricted'>
  owner?: string
  description?: string
}
