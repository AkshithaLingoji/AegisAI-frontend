import type { Extensible } from './common'

/**
 * A capability an agent can invoke. Describes what the tool is able to do,
 * not whether a given user is permitted to use it — that is decided by the
 * identity and policy layers, which this frontend does not implement.
 * @provisional
 */
export interface AgentTool {
  id: string
  agentId: string
  name: string
  description: string
  /** The kind of proposed action that invokes this tool. */
  actionKind: Extensible<'read' | 'write' | 'export' | 'send' | 'delete' | 'transfer'>
  /** Resources the tool can reach. Omitted when the tool is not tied to specific resources. */
  resourceIds?: string[]
  /** Scope label the identity layer would need to list for this tool (display only). */
  requiredScope?: string
  /** True when the tool is a simulation stand-in (no real transaction, export or message). */
  simulated: boolean
  /** Where the tool sends data, for tools that send it somewhere. */
  destination?: string
}
