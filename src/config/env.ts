import type { ExecutionSource } from '@/domain'

export interface AppEnv {
  source: ExecutionSource
  backendUrl?: string
}

interface RawEnv {
  VITE_AEGIS_SOURCE?: string
  VITE_AEGIS_BACKEND_URL?: string
}

/**
 * Parses build-time env. Unknown values fail loudly: silently defaulting could
 * show simulated data when the operator believed the backend was selected.
 */
export function readEnv(raw: RawEnv): AppEnv {
  const value = raw.VITE_AEGIS_SOURCE?.trim()
  if (!value || value === 'mock') {
    return { source: 'mock' }
  }
  if (value === 'backend') {
    return { source: 'backend', backendUrl: raw.VITE_AEGIS_BACKEND_URL?.trim() || undefined }
  }
  throw new Error(
    `Invalid VITE_AEGIS_SOURCE "${value}". Expected "mock" or "backend".`,
  )
}

export const env: AppEnv = readEnv(import.meta.env)

/** Exact wording required by the product brief. */
export const SOURCE_LABEL: Record<ExecutionSource, string> = {
  mock: 'MOCK / DEVELOPMENT',
  backend: 'CONNECTED BACKEND',
}
