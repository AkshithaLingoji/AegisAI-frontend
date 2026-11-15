import { describe, expect, it } from 'vitest'
import { createMockServices } from '@/services/mock'
import type { ExperimentResult } from '@/domain'
import { buildCommandCenterModel, type CommandCenterInput } from './model'

async function load(): Promise<CommandCenterInput> {
  const s = createMockServices()
  const [agents, principals, scenarios, resources, experiments] = await Promise.all([
    s.agents.listAgents(), s.agents.listPrincipals(), s.scenarios.listScenarios(),
    s.resources.listResources(), s.experiments.listExperiments(),
  ])
  return { agents, principals, scenarios, resources, experiments }
}

describe('buildCommandCenterModel (from the mock records)', () => {
  it('counts what exists', async () => {
    const m = buildCommandCenterModel(await load())
    expect(m.counts).toEqual({ agents: 2, scenarios: 4, runs: 8, resources: 9 })
    expect(m.totals.baseline.runs).toBe(4)
    expect(m.totals.protected.runs).toBe(4)
  })

  it('shows the same proposals in both conditions, but different outcomes for out-of-scope ones', async () => {
    const { totals } = buildCommandCenterModel(await load())
    expect(totals.protected.proposed).toBe(totals.baseline.proposed)
    expect(totals.protected.outOfScopeProposed).toBe(totals.baseline.outOfScopeProposed)
    expect(totals.baseline.outOfScopeProposed).toBe(2) // FIN-02 payroll export, HLT-02 Patient B read
    expect(totals.baseline.outOfScopeExecuted).toBe(2)
    expect(totals.baseline.outOfScopeBlocked).toBe(0)
    expect(totals.protected.outOfScopeExecuted).toBe(0)
    expect(totals.protected.outOfScopeBlocked).toBe(2)
  })

  it('evaluations exist only where an assurance layer ran', async () => {
    const { totals } = buildCommandCenterModel(await load())
    expect(totals.baseline.evaluated).toBe(0)
    expect(totals.protected.evaluated).toBe(totals.protected.proposed)
    expect(totals.protected.allowed + totals.protected.denied).toBe(totals.protected.evaluated)
    expect(totals.protected.denied).toBe(2)
  })

  it('gives each scenario a verdict per condition', async () => {
    const m = buildCommandCenterModel(await load())
    const verdicts = Object.fromEntries(m.scenarios.map((s) => [s.scenario.id, [s.baseline?.verdict, s.protected?.verdict]]))
    expect(verdicts).toEqual({
      'FIN-01': ['within-scope', 'within-scope'],
      'FIN-02': ['out-of-scope-executed', 'out-of-scope-blocked'],
      'HLT-01': ['within-scope', 'within-scope'],
      'HLT-02': ['out-of-scope-executed', 'out-of-scope-blocked'],
    })
  })

  it('reports resource state changes from the recorded before/after', async () => {
    const m = buildCommandCenterModel(await load())
    const payroll = m.resources.find((r) => r.resource.id === 'fin-payroll')!
    expect(payroll.changedRuns).toEqual({ baseline: 1, protected: 0 })
    expect(payroll.attempts).toEqual({ baseline: { executed: 1, blocked: 0 }, protected: { executed: 0, blocked: 1 } })
    expect(payroll.permittedFor).toEqual([]) // nobody is permitted
    const ledger = m.resources.find((r) => r.resource.id === 'fin-expenses-q3')!
    expect(ledger.permittedFor).toEqual(['Finance analyst (synthetic user)'])
  })

  it('lists out-of-scope actions as notable, newest first, with a reason', async () => {
    const m = buildCommandCenterModel(await load())
    expect(m.notable).toHaveLength(4)
    const stamps = m.notable.map((n) => n.timestamp)
    expect([...stamps].sort().reverse()).toEqual(stamps)
    const blocked = m.notable.find((n) => n.condition === 'protected' && n.scenarioId === 'FIN-02')!
    expect(blocked.outcome).toBe('blocked')
    expect(blocked.reason).toMatch(/not permitted/)
    const ran = m.notable.find((n) => n.condition === 'baseline' && n.scenarioId === 'FIN-02')!
    expect(ran.reason).toMatch(/No assurance layer/)
  })

  it('summarises each agent from its own runs', async () => {
    const m = buildCommandCenterModel(await load())
    const fin = m.agents.find((a) => a.agent.id === 'agent-finance')!
    expect(fin.runs).toBe(4)
    expect(fin.principal?.id).toBe('user-finance-analyst')
    expect(fin.permittedResources.map((r) => r.id)).toEqual(['fin-expenses-q3', 'fin-budgets-q3', 'fin-vendor-invoice', 'fin-q3-summary'])
  })
})

describe('aggregates are derived, not stored', () => {
  it('change when the underlying records change', async () => {
    const input = await load()
    const before = buildCommandCenterModel(input)

    // Pretend the Protected FIN-02 payroll export had actually executed.
    const tampered: ExperimentResult[] = JSON.parse(JSON.stringify(input.experiments))
    const run = tampered.find((e) => e.id === 'exp-FIN-02-protected')!
    const exportProposal = run.proposals.find((p) => p.kind === 'export')!
    run.gatewayResults.find((g) => g.proposalId === exportProposal.id)!.outcome = 'executed'

    const after = buildCommandCenterModel({ ...input, experiments: tampered })
    expect(before.totals.protected.outOfScopeExecuted).toBe(0)
    expect(after.totals.protected.outOfScopeExecuted).toBe(1)
    expect(after.totals.protected.outOfScopeBlocked).toBe(1)
    expect(after.scenarios.find((s) => s.scenario.id === 'FIN-02')!.protected!.verdict).toBe('out-of-scope-executed')
  })

  it('handles no data without inventing any', () => {
    const m = buildCommandCenterModel({ agents: [], principals: [], scenarios: [], resources: [], experiments: [] })
    expect(m.counts).toEqual({ agents: 0, scenarios: 0, runs: 0, resources: 0 })
    expect(m.totals.baseline.proposed).toBe(0)
    expect(m.notable).toEqual([])
  })

  it('does not assert out-of-scope when the user’s permitted list is unknown', async () => {
    const input = await load()
    const principals = input.principals.map(({ permittedResourceIds: _p, ...rest }) => rest)
    const m = buildCommandCenterModel({ ...input, principals })
    expect(m.totals.baseline.outOfScopeProposed).toBe(0)
  })

  it('ignores conditions it does not know rather than guessing', async () => {
    const input = await load()
    const odd: ExperimentResult[] = JSON.parse(JSON.stringify(input.experiments))
    odd[0]!.condition = 'something-new'
    const m = buildCommandCenterModel({ ...input, experiments: odd })
    expect(m.counts.runs).toBe(7)
  })
})
