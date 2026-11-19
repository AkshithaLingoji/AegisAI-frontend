/**
 * Compatibility guard: the canonical runner + `toExperimentResult` must reproduce the
 * earlier `simulateRun` output exactly (byte-for-byte JSON), for every catalogue
 * scenario under both conditions. `simulateRun` is the untouched reference.
 */
import { describe, expect, it } from 'vitest'
import { toExperimentResult } from '@/lib/runs/toExperimentResult'
import { scenarioFixtures } from '../fixtures'
import { simulateRun } from '../simulate'
import { catalogueEntries } from './profiles'
import { runTask } from './runner'

const BASE_MS = Date.UTC(2026, 2, 2, 9, 0, 0)
const SPACING = 10 * 60 * 1000

describe('runner + mapper reproduce the earlier simulation exactly', () => {
  const entries = catalogueEntries()
  entries.forEach((entry, i) => {
    ;(['baseline', 'protected'] as const).forEach((path, j) => {
      it(`${entry.task.id} / ${path}`, () => {
        const startMs = BASE_MS + (i * 2 + j) * SPACING
        const run = runTask(entry.task, { runId: `run-${entry.task.id}-${path}`, path, startMs, profile: entry.profile })
        const legacy = simulateRun(scenarioFixtures[i]!, path, startMs)
        expect(JSON.stringify(toExperimentResult(run))).toBe(JSON.stringify(legacy))
      })
    })
  })

  it('covers all four catalogue scenarios', () => {
    expect(entries.map((e) => e.task.id)).toEqual(['FIN-01', 'FIN-02', 'HLT-01', 'HLT-02'])
  })
})
