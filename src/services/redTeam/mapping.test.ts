import { describe, expect, it } from 'vitest'
import { RedTeamServiceError } from '../contracts'
import { mapExecutionStatus, mapReport, mapResult, mapScenario } from './mapping'

const P = { source: 'backend' } as const
const issues = (fn: () => unknown): string[] => {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(RedTeamServiceError)
    expect((e as RedTeamServiceError).code).toBe('invalid-data')
    return (e as RedTeamServiceError).issues
  }
  throw new Error('expected the mapper to throw')
}

describe('scenario mapping', () => {
  const raw = { scenario_id: 's-1', category: 'prompt_injection', description: 'D', input: 'text in', expected_behavior: 'E' }
  it('maps the essential fields to the frontend model and tags provenance', () => {
    expect(mapScenario(raw, P)).toEqual({
      id: 's-1', categoryId: 'prompt_injection', description: 'D', input: { format: 'text', text: 'text in' }, expectedBehavior: { summary: 'E' }, provenance: P,
    })
  })
  it('reports non-JSON expected_behavior details instead of silently dropping them', () => {
    const bad = (extra: Record<string, unknown>) => issues(() => mapScenario({ ...raw, expected_behavior: { summary: 'S', ...extra } }, P))
    for (const extra of [{ fn: () => 1 }, { u: undefined }, { n: Number.NaN }, { nested: { x: Symbol('s') } }, { list: [1, () => 2] }]) {
      expect(bad(extra).join('\n')).toMatch(/expected_behavior.*not valid JSON/)
    }
    expect(mapScenario({ ...raw, expected_behavior: { summary: 'S', ok: { a: [1, null, 'x'] } } }, P).expectedBehavior).toEqual({ summary: 'S', details: { ok: { a: [1, null, 'x'] } } })
  })
  it('accepts the object forms: category object, structured input, expected_behavior with details', () => {
    const s = mapScenario({ ...raw, title: 'T', category: { id: 'new_kind', label: 'x' }, input: { a: 1, b: ['x'] }, expected_behavior: { summary: 'S', must_not: ['leak'] } }, P)
    expect(s.categoryId).toBe('new_kind') // an id the UI has never heard of is carried through verbatim
    expect(s.title).toBe('T')
    expect(s.input).toEqual({ format: 'structured', fields: { a: 1, b: ['x'] } })
    expect(s.expectedBehavior).toEqual({ summary: 'S', details: { must_not: ['leak'] } })
  })
  it('reports every missing or malformed essential field at once, and guesses none', () => {
    const found = issues(() => mapScenario({ scenario_id: '', category: 3, input: null, expected_behavior: {} }, P))
    expect(found.join('\n')).toMatch(/scenario_id/)
    expect(found.join('\n')).toMatch(/category/)
    expect(found.join('\n')).toMatch(/description/)
    expect(found.join('\n')).toMatch(/input/)
    expect(found.join('\n')).toMatch(/expected_behavior/)
    expect(found.length).toBeGreaterThanOrEqual(5)
    expect(issues(() => mapScenario('not an object', P))[0]).toMatch(/not an object/)
    expect(issues(() => mapScenario({ ...raw, input: { bad: () => 1 } }, P)).join()).toMatch(/input/)
  })
})

describe('execution lifecycle is separate from the attack outcome', () => {
  const exec = { execution_id: 'e1', scenario_id: 's-1', requested_at: '2026-11-21T10:00:00Z' }
  it('maps all four lifecycle states and never assumes a result exists', () => {
    for (const status of ['pending', 'running', 'completed', 'failed'] as const) {
      const m = mapExecutionStatus({ ...exec, status }, P)
      expect(m.lifecycle).toBe(status)
      expect(m.resultAvailable).toBe(false)
      expect(m).not.toHaveProperty('outcome')
    }
    expect(mapExecutionStatus({ ...exec, status: 'completed', result_available: true }, P).resultAvailable).toBe(true)
  })
  it('a failure reason belongs to a failed lifecycle only', () => {
    expect(mapExecutionStatus({ ...exec, status: 'failed', error: 'harness crashed' }, P).failureReason).toBe('harness crashed')
    expect(mapExecutionStatus({ ...exec, status: 'failed' }, P).failureReason).toMatch(/no reason/)
    expect(mapExecutionStatus({ ...exec, status: 'completed', error: 'ignored' }, P)).not.toHaveProperty('failureReason')
  })
  it('rejects unknown lifecycle values and missing ids', () => {
    expect(issues(() => mapExecutionStatus({ ...exec, status: 'done' }, P)).join()).toMatch(/status/)
    expect(issues(() => mapExecutionStatus({ status: 'running' }, P)).length).toBeGreaterThanOrEqual(3)
  })
  it('a COMPLETED execution can carry a SUCCESSFUL attack: they are different concepts', () => {
    const status = mapExecutionStatus({ ...exec, status: 'completed', result_available: true }, P)
    const result = mapResult({ execution_id: 'e1', scenario_id: 's-1', outcome: { attempted: true, detected: false, blocked: false, successful: true } }, P)
    expect(status.lifecycle).toBe('completed')
    expect(result.outcome).toEqual({ status: 'evaluated', evaluation: { attempted: 'yes', detected: 'no', blocked: 'no', successful: 'yes' } })
  })
  it('a FAILED execution maps to infrastructure failure, not to “attack failed”', () => {
    const result = mapResult({ execution_id: 'e2', scenario_id: 's-1', outcome: { status: 'infrastructure_failure', reason: 'tool sandbox did not start' } }, P)
    expect(result.outcome).toEqual({ status: 'infrastructure_failure', reason: 'tool sandbox did not start' })
  })
})

describe('result mapping keeps the six concepts distinct', () => {
  const base = { execution_id: 'e1', scenario_id: 's-1' }
  it('attempted, detected, blocked and successful are independent findings', () => {
    const r = mapResult({ ...base, outcome: { attempted: true, detected: true, blocked: false, successful: true } }, P)
    expect(r.outcome).toMatchObject({ evaluation: { detected: 'yes', blocked: 'no', successful: 'yes' } })
  })
  it('null is “unknown”, a real answer; a missing finding is rejected rather than read as “no”', () => {
    const r = mapResult({ ...base, outcome: { attempted: true, detected: null, blocked: null, successful: null } }, P)
    expect(r.outcome).toMatchObject({ evaluation: { detected: 'unknown', blocked: 'unknown', successful: 'unknown' } })
    expect(issues(() => mapResult({ ...base, outcome: { attempted: true } }, P)).join()).toMatch(/missing value is not treated as “no”/)
  })
  it('an undecidable evaluation is its own outcome, with a reason', () => {
    expect(mapResult({ ...base, outcome: { status: 'unknown', reason: 'evaluator could not decide' } }, P).outcome).toEqual({ status: 'unknown', reason: 'evaluator could not decide' })
    expect(issues(() => mapResult({ ...base, outcome: { status: 'unknown' } }, P)).join()).toMatch(/reason/)
  })
  it('rejects an unrecognised outcome status', () => {
    expect(issues(() => mapResult({ ...base, outcome: { status: 'pwned' } }, P)).join()).toMatch(/outcome “status”/)
  })
  it('maps evidence records and validates them', () => {
    const r = mapResult({ ...base, outcome: { status: 'unknown', reason: 'r' }, evidence: [{ id: 'ev1', kind: 'trace', summary: 'S', content: 'c' }, { id: 'ev2', kind: 'novel_kind', summary: 'S2' }] }, P)
    expect(r.evidence.map((e) => e.kind)).toEqual(['trace', 'novel_kind'])
    expect(issues(() => mapResult({ ...base, outcome: { status: 'unknown', reason: 'r' }, evidence: [{ id: 'x' }] }, P)).join()).toMatch(/evidence:/)
    expect(issues(() => mapResult({ ...base, outcome: { status: 'unknown', reason: 'r' }, evidence: 'nope' }, P)).join()).toMatch(/evidence/)
  })
})

describe('report mapping', () => {
  it('maps a report reference', () => {
    expect(mapReport({ report_id: 'r1', title: 'T', formats: ['json', 'markdown'], execution_ids: ['e1'] }, P)).toEqual({
      id: 'r1', title: 'T', formats: ['json', 'markdown'], executionIds: ['e1'], provenance: P,
    })
    expect(mapReport({ report_id: 'r1', title: 'T', formats: [] }, P).executionIds).toEqual([])
  })
  it('rejects malformed reports', () => {
    expect(issues(() => mapReport({ title: 'T', formats: 'json' }, P)).length).toBe(2)
  })
})
