import { NotConnectedError, type SystemService } from '../contracts'

export interface BackendOptions {
  baseUrl?: string
}

/**
 * Backend adapter placeholder. The backend contracts have not been supplied,
 * so nothing here may guess an endpoint. It fails explicitly; the UI shows
 * that failure instead of falling back to mock data.
 */
export function createBackendSystemService(options: BackendOptions): SystemService {
  return {
    async getSourceInfo() {
      const target = options.baseUrl ? ` (configured URL: ${options.baseUrl})` : ' (no VITE_AEGIS_BACKEND_URL configured)'
      throw new NotConnectedError(
        `The backend adapter is not implemented yet${target}. It will be built once the approved backend contracts are available.`,
      )
    },
  }
}
