import type { AegisServices } from '../contracts'
import { agents, principals, resources, scenarioFixtures, tools } from './engine/fixtures'
import { deriveAuditRecords, seededExperiments } from './engine/seed'
import { createMockTaskServices } from './runs'
import { createMockSystemService } from './system'

export interface MockOptions {
  /** Artificial delay so loading states are visible in the UI. Use 0 in tests. */
  latencyMs?: number
  /** Clock for guided-run timestamps; defaults to the real clock. Tests inject a fixed one. */
  now?: () => number
}

/** Mock implementations. Private to the service layer — import via `@/services`. */
export function createMockServices({ latencyMs = 0, now }: MockOptions = {}): AegisServices {
  // Callers receive copies so they can never mutate the seeded records.
  const serve = <T>(read: () => T) => async (): Promise<T> => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
    return JSON.parse(JSON.stringify(read())) as T
  }
  return {
    system: createMockSystemService(),
    agents: { listAgents: serve(() => agents), listPrincipals: serve(() => principals), listTools: serve(() => tools) },
    scenarios: { listScenarios: serve(() => scenarioFixtures.map((f) => f.scenario)) },
    resources: { listResources: serve(() => resources) },
    experiments: { listExperiments: serve(() => seededExperiments()) },
    audit: { listAuditRecords: serve(() => deriveAuditRecords(seededExperiments())) },
    ...createMockTaskServices({ latencyMs, ...(now ? { now } : {}) }),
  }
}
