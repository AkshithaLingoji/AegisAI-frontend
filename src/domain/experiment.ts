import type { ActionProposal } from './task'
import type { Extensible, IsoTimestamp, Provenance } from './common'
import type { GatewayResult, PolicyEvaluation } from './enforcement'
import type { ExecutionEvent } from './evidence'

/** Snapshot pair for one resource. `null` means "did not exist / not captured".
 * @provisional */
export interface ResourceStateChange {
  resourceId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

/**
 * One run of one scenario under one condition. Both conditions of a scenario
 * must start from identical data and the identical attack payload.
 * @provisional
 */
export interface ExperimentResult {
  id: string
  scenarioId: string
  condition: Extensible<'baseline' | 'protected'>
  runId: string
  startedAt: IsoTimestamp
  completedAt: IsoTimestamp
  events: ExecutionEvent[]
  proposals: ActionProposal[]
  policyEvaluations: PolicyEvaluation[]
  gatewayResults: GatewayResult[]
  resourceChanges: ResourceStateChange[]
  finalReport?: string
  provenance: Provenance
}

/**
 * Aggregate metrics. Every value MUST be derivable from `ExperimentResult`
 * records referenced in `experimentIds` — never stored independently.
 * @provisional
 */
export interface BenchmarkResult {
  id: string
  suiteId: string
  generatedAt: IsoTimestamp
  experimentIds: string[]
  metrics: {
    name: string
    value: number
    unit?: string
    condition?: Extensible<'baseline' | 'protected'>
  }[]
  provenance: Provenance
}
