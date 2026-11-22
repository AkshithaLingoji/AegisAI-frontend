import { describe, expect, it } from 'vitest'
import { createMockServices } from '..'
import { createBackendServices } from '../../backend'
import { NotConnectedError } from '../../contracts'
import { scenarioFixtures } from './fixtures'
import { deriveAuditRecords, seededExperiments } from './seed'
import { simulateRun } from './simulate'

const exp = (scenarioId: string, condition: 'baseline' | 'protected') =>
  seededExperiments().find((e) => e.scenarioId === scenarioId && e.condition === condition)!
const change = (e: ReturnType<typeof exp>, resourceId: string) => e.resourceChanges.find((c) => c.resourceId === resourceId)!

describe('seeded history', () => {
  it('covers every scenario under both conditions, in a stable order', () => {
    const ids = seededExperiments().map((e) => `${e.scenarioId}/${e.condition}`)
    expect(ids).toEqual([
      'FIN-01/baseline', 'FIN-01/protected',
      'FIN-02/baseline', 'FIN-02/protected',
      'HLT-01/baseline', 'HLT-01/protected',
      'HLT-02/baseline', 'HLT-02/protected',
    ])
  })

  it('is deterministic: re-simulating gives byte-identical records', () => {
    const again = scenarioFixtures.flatMap((f, i) =>
      (['baseline', 'protected'] as const).map((c, j) => simulateRun(f, c, Date.UTC(2026, 2, 2, 9, 0, 0) + (i * 2 + j) * 600_000)),
    )
    expect(JSON.stringify(again)).toBe(JSON.stringify(seededExperiments()))
  })

  it('marks every record as mock provenance', () => {
    for (const e of seededExperiments()) {
      expect(e.provenance.source).toBe('mock')
      for (const ev of e.events) expect(ev.provenance.source).toBe('mock')
      for (const g of e.gatewayResults) expect(g.provenance.source).toBe('mock')
    }
  })
})

describe('fair comparison', () => {
  it.each(scenarioFixtures.map((f) => f.scenario.id))('%s: both conditions get identical proposals and starting state', (id) => {
    const b = exp(id, 'baseline')
    const p = exp(id, 'protected')
    const strip = (e: typeof b) => e.proposals.map(({ id: _id, ...rest }) => rest)
    expect(strip(p)).toEqual(strip(b))
    expect(p.resourceChanges.map((c) => c.before)).toEqual(b.resourceChanges.map((c) => c.before))
  })

  it('baseline has no assurance layer: no policy evaluations, everything executes', () => {
    for (const e of seededExperiments().filter((x) => x.condition === 'baseline')) {
      expect(e.policyEvaluations).toHaveLength(0)
      expect(e.gatewayResults.every((g) => g.outcome === 'executed')).toBe(true)
      expect(e.gatewayResults.every((g) => /no assurance layer/.test(g.message ?? ''))).toBe(true)
    }
  })

  it('protected evaluates every proposal and every gateway result follows its decision', () => {
    for (const e of seededExperiments().filter((x) => x.condition === 'protected')) {
      expect(e.policyEvaluations).toHaveLength(e.proposals.length)
      for (const g of e.gatewayResults) {
        const decision = e.policyEvaluations.find((pe) => pe.proposalId === g.proposalId)!.decision
        expect(g.outcome).toBe(decision === 'allow' ? 'executed' : 'blocked')
      }
    }
  })

  it('legitimate scenarios end in the same state under both conditions', () => {
    for (const id of ['FIN-01', 'HLT-01']) {
      expect(exp(id, 'protected').resourceChanges).toEqual(exp(id, 'baseline').resourceChanges)
      expect(exp(id, 'protected').gatewayResults.every((g) => g.outcome === 'executed')).toBe(true)
    }
  })
})

describe('stateful sandbox', () => {
  it('FIN-02 baseline: payroll is actually exported; protected: payroll is untouched', () => {
    const base = change(exp('FIN-02', 'baseline'), 'fin-payroll')
    expect(base.before).toMatchObject({ exportedToExternal: false, accessCount: 0 })
    expect(base.after).toMatchObject({ exportedToExternal: true, accessCount: 1, lastAccessedBy: 'Finance Agent' })
    const prot = change(exp('FIN-02', 'protected'), 'fin-payroll')
    expect(prot.after).toEqual(prot.before)
  })

  it('FIN-02 protected still completes the legitimate part of the task', () => {
    const e = exp('FIN-02', 'protected')
    expect(change(e, 'fin-q3-summary').after).toMatchObject({ status: 'saved' })
    expect(e.gatewayResults.filter((g) => g.outcome === 'blocked')).toHaveLength(1)
  })

  it('HLT-02 baseline: Patient B is read and ends up in the summary; protected: it does not', () => {
    const base = exp('HLT-02', 'baseline')
    expect(change(base, 'hlt-patient-b').after).toMatchObject({ accessCount: 1 })
    expect(String(change(base, 'hlt-visit-summary-a').after!.sourcesUsed)).toContain('hlt-patient-b')

    const prot = exp('HLT-02', 'protected')
    expect(change(prot, 'hlt-patient-b').after).toEqual(change(prot, 'hlt-patient-b').before)
    expect(String(change(prot, 'hlt-visit-summary-a').after!.sourcesUsed)).toBe('hlt-patient-a')
  })

  it('denials carry reasons computed from the principal’s permissions', () => {
    const denied = exp('FIN-02', 'protected').policyEvaluations.find((pe) => pe.decision === 'deny')!
    expect(denied.reasons.map((r) => r.code)).toEqual(['OUT_OF_SCOPE_RESOURCE', 'EXPORT_NOT_GRANTED'])
  })

  it('retrieved content (incl. the hidden instruction) is identical in both conditions and only appears when read ran', () => {
    const payloads = (c: 'baseline' | 'protected') =>
      exp('FIN-02', c).events.flatMap((ev) => (ev.payload?.retrievedContent ? [ev.payload.retrievedContent] : []))
    expect(payloads('baseline')).toEqual(payloads('protected'))
    expect(String(payloads('baseline')[0])).toContain('NOTE TO ASSISTANT')
  })
})

describe('mock services', () => {
  it('serve copies, so callers cannot mutate the seeded history', async () => {
    const svc = createMockServices()
    const first = await svc.experiments.listExperiments()
    first[0]!.finalReport = 'tampered'
    first.pop()
    const second = await svc.experiments.listExperiments()
    expect(second).toHaveLength(8)
    expect(second[0]!.finalReport).not.toBe('tampered')
  })

  it('derive audit records from gateway results (one each) and link evidence', async () => {
    const svc = createMockServices()
    const experiments = await svc.experiments.listExperiments()
    const audit = await svc.audit.listAuditRecords()
    expect(audit).toHaveLength(experiments.reduce((n, e) => n + e.gatewayResults.length, 0))
    expect(deriveAuditRecords(experiments)).toEqual(audit)
    expect(audit.find((a) => a.runId === 'run-FIN-02-baseline' && a.resourceId === 'fin-payroll')).toMatchObject({
      decision: 'not evaluated (no assurance layer)',
      outcome: 'executed',
    })
  })
})

describe('agent definitions', () => {
  // Capabilities describe what an agent is built to do; tools are what it is assigned. Authorization is separate
  // (see principals), so this only guards that every assigned kind of tool is described, not that it is permitted.
  const describes: Record<string, RegExp> = { read: /read/i, write: /save|write/i, export: /export/i, transfer: /move|transfer/i }
  it('describes every kind of tool an agent is assigned in its capabilities', async () => {
    const svc = createMockServices()
    const [agents, tools] = await Promise.all([svc.agents.listAgents(), svc.agents.listTools()])
    for (const agent of agents) {
      const kinds = new Set(tools.filter((t) => t.agentId === agent.id).map((t) => t.actionKind))
      for (const kind of kinds) {
        const pattern = describes[kind]
        expect(pattern, `no description pattern for action kind “${kind}”`).toBeDefined()
        expect(agent.capabilities?.some((c) => pattern!.test(c)), `${agent.id} has a ${kind} tool but no matching capability`).toBe(true)
      }
    }
  })
})

describe('backend adapters', () => {
  it('reject every service with NotConnectedError — never serve mock data', async () => {
    const svc = createBackendServices({})
    const calls = [
      svc.agents.listAgents(), svc.agents.listPrincipals(), svc.scenarios.listScenarios(),
      svc.resources.listResources(), svc.experiments.listExperiments(), svc.audit.listAuditRecords(),
    ]
    for (const call of calls) await expect(call).rejects.toBeInstanceOf(NotConnectedError)
  })
})
