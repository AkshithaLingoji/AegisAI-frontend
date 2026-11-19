import { describe, expect, it } from 'vitest'
import { digestCanonical } from '@/lib/runs/canonical'
import { deriveProposalOutcome } from '@/lib/runs/compare'
import { toExperimentResult } from '@/lib/runs/toExperimentResult'
import { ApprovalError, resolveApproval, runTask } from './runner'
import { START, action, customTask, profileOf } from './testKit'

const profile = () =>
  profileOf([action('read', 'fin-expenses-q3', 'Read ledger'), action('write', 'fin-q3-summary', 'Save summary'), action('read', 'fin-vendor-invoice', 'Read vendor notes')], {
    approvalRequiredActions: [1],
  })
const pending = () => runTask(customTask(), { runId: 'run-appr', path: 'protected', startMs: START, profile: profile() })
const LATER = START + 3_600_000
const opts = (extra: { note?: string; nowMs?: number } = {}) => ({ nowMs: LATER, profile: profile(), ...extra })

describe('a REQUIRE_APPROVAL decision pauses the run at that action', () => {
  it('stops at the awaiting action: later actions are not yet proposed, decided, dispatched or run', () => {
    const r = pending()
    expect(r.status).toBe('awaiting_approval')
    expect(r.completedAt).toBeUndefined()
    expect(r.finalReport).toBeUndefined()
    expect(r.proposals).toHaveLength(2) // the third action has not been proposed yet
    const p2 = r.proposals[1]!
    expect(deriveProposalOutcome(r, p2.id)).toEqual({
      proposalId: p2.id, decision: 'require_approval', approval: 'pending', gateway: null, execution: null, stateChanged: false,
    })
    expect(r.approvalRequests).toHaveLength(1)
    expect(r.approvalRequests[0]).toMatchObject({ proposalId: p2.id, simulated: true })
    expect(r.executionResults.map((x) => x.proposalId)).toEqual([r.proposals[0]!.id])
  })
  it('baseline never asks for approval (no assurance layer)', () => {
    const r = runTask(customTask(), { runId: 'run-b', path: 'baseline', startMs: START, profile: profile() })
    expect(r.approvalRequests).toEqual([])
    expect(r.status).toBe('completed')
  })
})

describe('ordered pause / resume with dependent actions', () => {
  // The write records which sources were read BEFORE it ran, so order is observable:
  // a read that follows the write in the plan must never show up in its sourcesUsed.
  const dependent = () =>
    profileOf(
      [action('read', 'fin-expenses-q3', 'Read ledger'), action('write', 'fin-q3-summary', 'Save summary'), action('read', 'fin-vendor-invoice', 'Read vendor notes afterwards')],
      { approvalRequiredActions: [1] },
    )
  const run = () => runTask(customTask(), { runId: 'run-dep', path: 'protected', startMs: START, profile: dependent() })
  const state = (r: ReturnType<typeof run>, id: string) => r.stateChanges.find((c) => c.resourceId === id)!.after

  it('approved: the awaiting write runs before the later read', () => {
    const r = run()
    const done = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', { nowMs: LATER, profile: dependent() })
    expect(done.status).toBe('completed')
    expect(done.proposals.map((p) => p.summary)).toEqual(['Read ledger', 'Save summary', 'Read vendor notes afterwards'])
    expect(done.gatewayResults.map((g) => g.proposalId)).toEqual(done.proposals.map((p) => p.id))
    expect(done.executionResults.map((x) => x.proposalId)).toEqual(done.proposals.map((p) => p.id))
    expect(done.executionResults.every((x) => x.status === 'ran')).toBe(true)
    expect(state(done, 'fin-q3-summary')).toMatchObject({ status: 'saved', sourcesUsed: 'fin-expenses-q3' })
    // identical to a run of the same plan that never needed approval
    const straight = runTask(customTask(), { runId: 'run-dep', path: 'protected', startMs: START, profile: { ...dependent(), approvalRequiredActions: [] } })
    expect(JSON.stringify(done.stateChanges)).toBe(JSON.stringify(straight.stateChanges))
    expect(done.events.map((e) => e.seq)).toEqual(done.events.map((_, i) => i + 1))
  })
  it('records the events of the resumed actions after the resolution, in plan order', () => {
    const r = run()
    const done = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', { nowMs: LATER, profile: dependent() })
    const added = done.events.slice(r.events.length)
    expect(added[0]!.kind).toBe('approval_resolved')
    expect(added.filter((e) => e.kind === 'proposed').map((e) => e.proposalId)).toEqual([done.proposals[2]!.id])
    expect(added.filter((e) => e.kind === 'dispatched').map((e) => e.proposalId)).toEqual([done.proposals[1]!.id, done.proposals[2]!.id])
  })
  it('rejected: the write has no effect and the later read still proceeds from the true state', () => {
    const r = run()
    const done = resolveApproval(r, r.approvalRequests[0]!.id, 'rejected', { nowMs: LATER, profile: dependent() })
    expect(done.status).toBe('completed')
    expect(deriveProposalOutcome(done, done.proposals[1]!.id)).toMatchObject({ approval: 'rejected', gateway: 'blocked', execution: 'not_run', stateChanged: false })
    expect(state(done, 'fin-q3-summary')).toMatchObject({ status: 'not created' })
    expect(deriveProposalOutcome(done, done.proposals[2]!.id).execution).toBe('ran')
  })
  it('can pause again: a second approval-required action waits until the first is resolved', () => {
    const two = profileOf(
      [action('read', 'fin-expenses-q3', 'Read ledger'), action('write', 'fin-q3-summary', 'Save summary'), action('read', 'fin-vendor-invoice', 'Read vendor notes'), action('write', 'fin-q3-summary', 'Update summary')],
      { approvalRequiredActions: [1, 3] },
    )
    const r = runTask(customTask(), { runId: 'run-two', path: 'protected', startMs: START, profile: two })
    expect(r.proposals).toHaveLength(2)
    const mid = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', { nowMs: LATER, profile: two })
    expect(mid.status).toBe('awaiting_approval')
    expect(mid.proposals).toHaveLength(4)
    expect(mid.approvalRequests).toHaveLength(2)
    expect(deriveProposalOutcome(mid, mid.proposals[3]!.id)).toMatchObject({ approval: 'pending', gateway: null, execution: null })
    expect(mid.executionResults.map((x) => x.proposalId)).toEqual([mid.proposals[0]!.id, mid.proposals[1]!.id, mid.proposals[2]!.id])
    expect(state(mid, 'fin-q3-summary')).toMatchObject({ sourcesUsed: 'fin-expenses-q3' })
    const end = resolveApproval(mid, mid.approvalRequests[1]!.id, 'approved', { nowMs: LATER + 60_000, profile: two })
    expect(end.status).toBe('completed')
    expect(end.executionResults.map((x) => x.proposalId)).toEqual(end.proposals.map((p) => p.id))
    expect(state(end, 'fin-q3-summary')).toMatchObject({ sourcesUsed: 'fin-expenses-q3, fin-vendor-invoice' })
  })
  it('refuses a mismatched profile and a resolution time before the run’s history', () => {
    const r = run()
    const id = r.approvalRequests[0]!.id
    expect(() => resolveApproval(r, id, 'approved', { nowMs: LATER, profile: { ...dependent(), id: 'other' } })).toThrow(expect.objectContaining({ code: 'profile-mismatch' }))
    expect(() => resolveApproval(r, id, 'approved', { nowMs: START - 1, profile: dependent() })).toThrow(expect.objectContaining({ code: 'time-before-history' }))
  })
  it('records a SHA-256 digest of the complete profile at start', () => {
    const d = run().provenance.simulation!.profileDigest
    expect(d.algorithm).toBe('sha-256')
    expect(d.hex).toMatch(/^[0-9a-f]{64}$/)
    expect(d).toEqual(digestCanonical(dependent()))
  })
  it('rejects a profile with the SAME id but a changed plan or retrieved content, leaving the run untouched', () => {
    const r = run()
    const id = r.approvalRequests[0]!.id
    const before = JSON.stringify(r)
    const changedPlan = { ...dependent(), plan: dependent().plan.map((a, i) => (i === 2 ? { ...a, targetResourceId: 'fin-payroll', summary: 'Read payroll' } : a)) }
    const changedParams = { ...dependent(), plan: dependent().plan.map((a, i) => (i === 2 ? { ...a, parameters: { range: 'ALL' } } : a)) }
    const changedContent = { ...dependent(), retrievedContent: { 'fin-vendor-invoice': 'injected text' } }
    const changedApprovals = { ...dependent(), approvalRequiredActions: [] }
    for (const bad of [changedPlan, changedParams, changedContent, changedApprovals]) {
      expect(bad.id).toBe(dependent().id)
      expect(() => resolveApproval(r, id, 'approved', { nowMs: LATER, profile: bad })).toThrow(expect.objectContaining({ code: 'profile-mismatch' }))
      expect(() => resolveApproval(r, id, 'rejected', { nowMs: LATER, profile: bad })).toThrow(expect.objectContaining({ code: 'profile-mismatch' }))
    }
    expect(JSON.stringify(r)).toBe(before) // nothing appended or changed
    expect(r.approvalResolutions).toHaveLength(0)
    // the genuine profile still resolves it afterwards
    expect(resolveApproval(r, id, 'approved', { nowMs: LATER, profile: dependent() }).status).toBe('completed')
  })
  it('refuses a different profile id and a resolution time before the run’s history', () => {
    const r = run()
    const id = r.approvalRequests[0]!.id
    const before = JSON.stringify(r)
    expect(() => resolveApproval(r, id, 'approved', { nowMs: LATER, profile: { ...dependent(), id: 'other' } })).toThrow(expect.objectContaining({ code: 'profile-mismatch' }))
    expect(() => resolveApproval(r, id, 'approved', { nowMs: START - 1, profile: dependent() })).toThrow(expect.objectContaining({ code: 'time-before-history' }))
    expect(JSON.stringify(r)).toBe(before)
  })
})

describe('approval is append-only', () => {
  it('leaves the original ApprovalRequest unchanged after resolution', () => {
    const r = pending()
    const requestBefore = JSON.stringify(r.approvalRequests[0])
    const next = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', opts())
    expect(JSON.stringify(next.approvalRequests[0])).toBe(requestBefore)
    expect(next.approvalRequests).toHaveLength(1)
    expect(Object.keys(next.approvalRequests[0]!)).not.toContain('outcome')
  })
  it('appends a separate ApprovalResolution and a separate approval_resolved event', () => {
    const r = pending()
    const next = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', opts({ note: 'Looks fine' }))
    expect(next.approvalResolutions).toHaveLength(1)
    expect(next.approvalResolutions[0]).toMatchObject({ requestId: r.approvalRequests[0]!.id, outcome: 'approved', note: 'Looks fine', simulated: true, resolvedAt: new Date(LATER).toISOString() })
    const added = next.events.slice(r.events.length)
    expect(added[0]).toMatchObject({ kind: 'approval_resolved', recordId: next.approvalResolutions[0]!.id })
    expect(added.map((e) => e.kind)).toEqual(['approval_resolved', 'dispatched', 'executed', 'state_changed', 'proposed', 'evaluated', 'dispatched', 'executed', 'state_changed', 'report_generated'])
  })
  it('keeps approval, gateway dispatch and execution as separate records and events', () => {
    const r = pending()
    const next = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', opts())
    const p2 = next.proposals[1]!
    expect(deriveProposalOutcome(next, p2.id)).toEqual({
      proposalId: p2.id, decision: 'require_approval', approval: 'approved', gateway: 'dispatched', execution: 'ran', stateChanged: true,
    })
    expect(next.status).toBe('completed')
    expect(next.revision).toBe(r.revision + 1)
    expect(next.finalReport).toContain('3 of 3 proposed actions ran')
    expect(next.stateChanges.find((c) => c.resourceId === 'fin-q3-summary')!.after).toMatchObject({ status: 'saved' })
  })
  it('a rejection blocks and does not run, and the run still completes', () => {
    const r = pending()
    const next = resolveApproval(r, r.approvalRequests[0]!.id, 'rejected', opts())
    const p2 = next.proposals[1]!
    expect(deriveProposalOutcome(next, p2.id)).toEqual({
      proposalId: p2.id, decision: 'require_approval', approval: 'rejected', gateway: 'blocked', execution: 'not_run', stateChanged: false,
    })
    expect(next.status).toBe('completed')
    expect(next.finalReport).toContain('2 of 3 proposed actions ran')
    expect(next.stateChanges.find((c) => c.resourceId === 'fin-q3-summary')!.after).toMatchObject({ status: 'not created' })
  })
  it('rejects a second resolution of the same request', () => {
    const r = pending()
    const once = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', opts())
    expect(() => resolveApproval(once, r.approvalRequests[0]!.id, 'rejected', opts({ nowMs: LATER + 1000 }))).toThrow(ApprovalError)
    try {
      resolveApproval(once, r.approvalRequests[0]!.id, 'approved', opts({ nowMs: LATER + 1000 }))
      expect.unreachable()
    } catch (e) {
      expect(e).toMatchObject({ code: 'already-resolved', name: 'ApprovalAlreadyResolvedError' })
    }
    expect(once.approvalResolutions).toHaveLength(1) // nothing was appended by the failed attempts
  })
  it('rejects an unknown request id', () => {
    expect(() => resolveApproval(pending(), 'nope', 'approved', opts())).toThrow(/No approval request/)
  })
  it('keeps the event history append-only: earlier events are unchanged and positions never move', () => {
    const r = pending()
    const before = JSON.stringify(r.events)
    const original = JSON.stringify(r)
    const next = resolveApproval(r, r.approvalRequests[0]!.id, 'approved', opts())
    expect(JSON.stringify(next.events.slice(0, r.events.length))).toBe(before)
    expect(next.events.length).toBeGreaterThan(r.events.length)
    expect(next.events.map((e) => e.seq)).toEqual(next.events.map((_, i) => i + 1))
    expect(new Set(next.events.map((e) => e.id)).size).toBe(next.events.length)
    // earlier records of every kind are a prefix of the new ones
    for (const key of ['proposals', 'decisions', 'gatewayResults', 'executionResults'] as const) {
      expect(JSON.stringify(next[key].slice(0, r[key].length))).toBe(JSON.stringify(r[key]))
    }
    // and the input run was not mutated
    expect(JSON.stringify(r)).toBe(original)
  })
  it('is deterministic for a given resolution time', () => {
    const a = resolveApproval(pending(), 'run-appr-ar2', 'approved', opts())
    const b = resolveApproval(pending(), 'run-appr-ar2', 'approved', opts())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
  it('stays compatible with the legacy shape after an approval', () => {
    const next = resolveApproval(pending(), 'run-appr-ar2', 'approved', opts())
    const legacy = toExperimentResult(next)
    expect(legacy.gatewayResults.map((g) => g.outcome)).toEqual(['executed', 'executed', 'executed'])
    expect(legacy.policyEvaluations[1]!.decision).toBe('require_approval')
  })
})
