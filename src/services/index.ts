import { env } from '@/config/env'
import type { ExecutionSource } from '@/domain'
import type { AegisServices } from './contracts'
import { createBackendServices } from './backend'
import { createMockServices } from './mock'

export * from './contracts'

/**
 * The single place that decides which implementation the app uses. Exactly one
 * source is active; there is deliberately no fallback from backend to mock.
 */
export const configuredSource: ExecutionSource = env.source

// A short artificial delay makes loading states visible in the running app.
const MOCK_LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 350

export const services: AegisServices =
  env.source === 'mock'
    ? createMockServices({ latencyMs: MOCK_LATENCY_MS })
    : createBackendServices({ baseUrl: env.backendUrl })
