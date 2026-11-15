import type { Extensible } from './common'

/** @provisional */
export interface Agent {
  id: string
  name: string
  domain: Extensible<'finance' | 'health'>
  description: string
  status?: Extensible<'idle' | 'running' | 'disabled'>
  /** Human-readable name of the environment the agent operates in. */
  environment?: string
  capabilities?: string[]
}

/**
 * The identity an action is evaluated against.
 * @provisional
 */
export interface AuthenticatedPrincipal {
  id: string
  displayName: string
  kind: Extensible<'user' | 'agent' | 'service'>
  roles: string[]
  /** Free-form scope labels as presented by the identity layer. */
  scopes: string[]
  /** Resources this principal is permitted to reach, when the backend reports it. */
  permittedResourceIds?: string[]
}
