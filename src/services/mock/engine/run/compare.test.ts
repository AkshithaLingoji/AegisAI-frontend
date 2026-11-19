import { describe, expect, it } from 'vitest'
import type { RunRecord } from '@/domain'
import { deriveComparison } from '@/lib/runs/compare'
import { digestCanonical } from '@/lib/runs/canonical'
import { runTaskPair } from './runner'
import { START, action, customTask, entry, profileOf } from './testKit'

const pairOf = (id: string) =>
  runTaskPair(entry(id).task, { idBase: `run-${id}`, baselineStartMs: START, protectedStartMs: START + 600_000, profile: entry(id).profile })

describe('Baseline vs Protected comparison', () => {
  it('derives every figure from the two recorded runs (FIN-02)', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-02')
    const c = deriveComparison(group, baseline, prot)
    expect(c.comparable).toBe(true)
    if (!c.comparable) return
    expect(c.totals).toEqual({ proposals: 4, baselineRan: 4, protectedRan: 3, protectedBlocked: 1 })
    // payroll was exported only on baseline; the baseline summary also records payroll as a source it used
    expect(c.resourcesWithDifferentFinalState).toEqual(['fin-q3-summary', 'fin-payroll'])
    const exportRow = c.rows.find((r) => r.summary.includes('Export'))!
    expect(exportRow.baseline).toMatchObject({ decision: null, gateway: 'dispatched', execution: 'ran' })
    expect(exportRow.protected).toMatchObject({ decision: 'deny', gateway: 'blocked', execution: 'not_run' })
  })
  it('shows no difference for a legitimate task (FIN-01)', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-01')
    const c = deriveComparison(group, baseline, prot)
    expect(c.comparable && c.totals.baselineRan === c.totals.protectedRan && c.resourcesWithDifferentFinalState.length === 0).toBe(true)
  })
  it('is not comparable while a run is awaiting approval', () => {
    const profile = profileOf([action('read', 'fin-expenses-q3', 'Read ledger'), action('write', 'fin-q3-summary', 'Save summary')], { approvalRequiredActions: [1] })
    const { group, baseline, protected: prot } = runTaskPair(customTask(), { idBase: 'run-c', baselineStartMs: START, protectedStartMs: START + 1, profile })
    const c = deriveComparison(group, baseline, prot)
    expect(c.comparable).toBe(false)
    if (!c.comparable) expect(c.reasons.join(' ')).toMatch(/awaiting approval/)
  })
  it('refuses to compare when the initial state digests differ', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-02')
    const tampered: RunRecord = { ...prot, initialState: { ...prot.initialState, digest: digestCanonical({ other: 1 }) } }
    const c = deriveComparison(group, baseline, tampered)
    expect(c.comparable).toBe(false)
    if (!c.comparable) expect(c.reasons).toContain('The runs did not start from identical initial state.')
  })
  it('refuses to compare when the inputs are not equivalent', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-02')
    const other: RunRecord = { ...prot, inputsDigest: digestCanonical(['different']) }
    const c = deriveComparison(group, baseline, other)
    expect(c.comparable).toBe(false)
    if (!c.comparable) expect(c.reasons).toContain('The runs did not receive equivalent inputs.')
  })
  it('refuses runs that proposed different actions, or are not a baseline/protected pair', () => {
    const a = pairOf('FIN-01')
    const b = pairOf('FIN-02')
    const diffPlan = deriveComparison(a.group, a.baseline, { ...b.protected, id: a.group.protectedRunId })
    expect(diffPlan.comparable).toBe(false)
    const wrongKinds = deriveComparison({ ...a.group, baselineRunId: a.protected.id, protectedRunId: a.baseline.id }, a.protected, a.baseline)
    expect(wrongKinds.comparable).toBe(false)
  })
  it('refuses actions that differ only in parameters, with identical summaries', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-01')
    const proposals = prot.proposals.map((p, i) => (i === 0 ? { ...p, parameters: { ...p.parameters, range: 'ALL' } } : p))
    const c = deriveComparison(group, baseline, { ...prot, proposals })
    expect(c.comparable).toBe(false)
    if (!c.comparable) expect(c.reasons).toContain('The runs did not propose the same actions.')
  })
  it('refuses actions that differ in sequence, agent id or order', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-01')
    const reseq = prot.proposals.map((p, i) => (i === 0 ? { ...p, sequence: 99 } : p))
    expect(deriveComparison(group, baseline, { ...prot, proposals: reseq }).comparable).toBe(false)
    const agent = prot.proposals.map((p, i) => (i === 0 ? { ...p, agentId: 'other' } : p))
    expect(deriveComparison(group, baseline, { ...prot, proposals: agent }).comparable).toBe(false)
    expect(deriveComparison(group, baseline, { ...prot, proposals: [...prot.proposals].reverse() }).comparable).toBe(false)
  })
  it('refuses when the group’s recorded digests do not match both runs', () => {
    const { group, baseline, protected: prot } = pairOf('FIN-02')
    const badState = deriveComparison({ ...group, initialStateDigest: digestCanonical({ x: 1 }) }, baseline, prot)
    expect(badState.comparable).toBe(false)
    if (!badState.comparable) expect(badState.reasons).toContain('The group’s initial-state digest does not match both runs.')
    const badInputs = deriveComparison({ ...group, inputsDigest: digestCanonical(['x']) }, baseline, prot)
    expect(badInputs.comparable).toBe(false)
    if (!badInputs.comparable) expect(badInputs.reasons).toContain('The group’s inputs digest does not match both runs.')
  })
  it('refuses when a run’s recorded digest does not match its own recorded content', () => {
    const task = customTask({ inputs: [{ id: 'notes', label: 'Notes', format: 'text', content: 'hello', trust: { level: 'untrusted', assignedBy: 'default', reason: 'User-provided content is untrusted by default.' } }] })
    const { group, baseline, protected: prot } = runTaskPair(task, { idBase: 'run-in', baselineStartMs: START, protectedStartMs: START + 1, profile: entry('FIN-02').profile })
    expect(deriveComparison(group, baseline, prot).comparable).toBe(true)
    const forgedInputs: RunRecord = { ...prot, inputs: prot.inputs.map((i, n) => (n === 0 ? { ...i, content: i.content + ' ' } : i)) }
    const a = deriveComparison(group, baseline, forgedInputs)
    expect(a.comparable).toBe(false)
    const resources = JSON.parse(JSON.stringify(prot.initialState.resources))
    resources[Object.keys(resources)[0]!].accessCount = 42
    const forgedState: RunRecord = { ...prot, initialState: { ...prot.initialState, resources } }
    expect(deriveComparison(group, baseline, forgedState).comparable).toBe(false)
  })
})
