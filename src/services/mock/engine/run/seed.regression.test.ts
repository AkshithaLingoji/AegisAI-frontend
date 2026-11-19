/**
 * Regression guard for the seeded history.
 *
 * GOLDEN_SHA256 is the SHA-256 of `JSON.stringify(seededExperiments())` taken from
 * the verified d7972d6 baseline BEFORE the runner refactor. The seeded experiments
 * must stay byte-identical so the Command Center and Agent Operations are unchanged.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { seededExperiments } from '../seed'

const GOLDEN_SHA256 = 'd0b22758a6710b8e68bf67812dbc629b68def37d342ba6d28f831e22246bc397'
const GOLDEN_LENGTH = 61908

describe('seeded experiments regression guard', () => {
  it('are byte-identical to the verified baseline output', () => {
    const json = JSON.stringify(seededExperiments())
    expect(seededExperiments()).toHaveLength(8)
    expect(json.length).toBe(GOLDEN_LENGTH)
    expect(createHash('sha256').update(json, 'utf8').digest('hex')).toBe(GOLDEN_SHA256)
  })
})
