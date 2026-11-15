import { describe, expect, it } from 'vitest'
import { createMockServices } from '@/services/mock'
import { buildAgentOperationsModel, type AgentOperationsInput } from './model'

async function load(): Promise<AgentOperationsInput> {
  const s = createMockServices()
  const [agents, principals, tools, scenarios, resources, experiments, audit] = await Promise.all([
    s.agents.listAgents(), s.agents.listPrincipals(), s.agents.listTools(), s.scenarios.listScenarios(),
    s.resources.listResources(), s.experiments.listExperiments(), s.audit.listAuditRecords(),
  ])
  return { agents, principals, tools, scenarios, resources, experiments, audit }
}

describe('buildAgentOperationsModel (from the mock records)', () => {
  it('builds one workspace per agent with its own tasks', async () => {
    const m = buildAgentOperationsModel(await load())
    expect(m.agents.map((a) => a.agent.id)).toEqual(['agent-finance', 'agent-health'])
    expect(m.agents[0]!.previousTasks.map((t) => t.scenario.id)).toEqual(['FIN-01', 'FIN-02'])
    expect(m.agents[1]!.previousTasks.map((t) => t.scenario.id)).toEqual(['HLT-01', 'HLT-02'])
    expect(m.agents[0]!.previousTasks[0]!.runs.map((r) => r.condition)).toEqual(['baseline', 'protected'])
  })

  it('derives execution counts from run records', async () => {
    const [fin, hlt] = buildAgentOperationsModel(await load()).agents
    expect(fin!.totals).toEqual({ runs: 4, proposed: 14, executed: 13, blocked: 1, outOfScopeProposed: 2 })
    expect(hlt!.totals).toEqual({ runs: 4, proposed: 10, executed: 9, blocked: 1, outOfScopeProposed: 2 })
    expect(fin!.lastRunAt).toBe('2026-03-02T09:30:21.600Z')
  })

  it('splits permitted from restricted resources using the identity record', async () => {
    const [fin, hlt] = buildAgentOperationsModel(await load()).agents
    expect(fin!.permittedResources.map((r) => r.resource.id)).toEqual([
      'fin-expenses-q3', 'fin-budgets-q3', 'fin-vendor-invoice', 'fin-q3-summary',
    ])
    expect(fin!.restrictedResources.map((r) => r.resource.id)).toEqual(['fin-payroll'])
    expect(hlt!.permittedResources.map((r) => r.resource.id)).toEqual(['hlt-patient-a', 'hlt-appointments', 'hlt-visit-summary-a'])
    expect(hlt!.restrictedResources.map((r) => r.resource.id)).toEqual(['hlt-patient-b'])
    expect(fin!.restrictedResources[0]!.uses).toEqual({ proposed: 2, executed: 1, blocked: 1 })
  })

  it('attributes proposals to tools and reports which tools were never used', async () => {
    const [fin] = buildAgentOperationsModel(await load()).agents
    const byId = Object.fromEntries(fin!.tools.map((t) => [t.tool.id, t]))
    expect(byId['tool-fin-export']!.uses).toEqual({ proposed: 2, executed: 1, blocked: 1 })
    expect(byId['tool-fin-export']!.grant).toBe('not-listed')
    expect(byId['tool-fin-transaction']!.uses).toEqual({ proposed: 0, executed: 0, blocked: 0 })
    expect(byId['tool-fin-read']!.grant).toBe('listed')
  })

  it('has no current task when nothing is recorded as running', async () => {
    const m = buildAgentOperationsModel(await load())
    expect(m.agents.every((a) => a.currentTasks.length === 0)).toBe(true)
  })

  it('keeps proposals, evaluations and outcomes together; Baseline has no evaluations', async () => {
    const [fin] = buildAgentOperationsModel(await load()).agents
    const [baseline, prot] = fin!.previousTasks[1]!.runs
    const exportB = baseline!.proposals.find((p) => p.proposal.kind === 'export')!
    const exportP = prot!.proposals.find((p) => p.proposal.kind === 'export')!
    expect(exportB).toMatchObject({ outOfScope: true, outcome: 'executed', evaluation: undefined })
    expect(exportP).toMatchObject({ outOfScope: true, outcome: 'blocked' })
    expect(exportP.evaluation?.decision).toBe('deny')
    expect(baseline!.outOfScopeExecuted).toBe(1)
    expect(prot!.outOfScopeBlocked).toBe(1)
  })

  it('lists audit records for the agent, newest first, flagging out-of-scope targets', async () => {
    const [fin, hlt] = buildAgentOperationsModel(await load()).agents
    expect(fin!.audit).toHaveLength(14)
    expect(hlt!.audit).toHaveLength(10)
    expect(fin!.audit.filter((a) => a.needsAttention)).toHaveLength(2)
    const times = fin!.audit.map((a) => a.record.timestamp)
    expect([...times].sort().reverse()).toEqual(times)
  })

  it('asserts nothing about scope when the identity record does not say', async () => {
    const input = await load()
    input.principals = input.principals.map((p) => ({ ...p, permittedResourceIds: undefined }))
    const [fin] = buildAgentOperationsModel(input).agents
    expect(fin!.restrictedResources).toEqual([])
    expect(fin!.unknownResources.length).toBeGreaterThan(0)
    expect(fin!.audit.some((a) => a.needsAttention)).toBe(false)
  })

  it('handles empty input', () => {
    expect(buildAgentOperationsModel({ agents: [], principals: [], tools: [], scenarios: [], resources: [], experiments: [], audit: [] }).agents).toEqual([])
  })
})
