import { NotConnectedError } from '../contracts'

/**
 * Every backend method fails explicitly until the approved backend contracts
 * exist. The UI shows the failure; it never substitutes mock data.
 */
export function notConnected(what: string, baseUrl?: string): never {
  const target = baseUrl ? ` (configured URL: ${baseUrl})` : ' (no VITE_AEGIS_BACKEND_URL configured)'
  throw new NotConnectedError(
    `The backend adapter for ${what} is not implemented yet${target}. It will be built once the approved backend contracts are available.`,
  )
}
