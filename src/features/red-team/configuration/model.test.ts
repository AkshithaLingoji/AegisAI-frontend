import { describe, expect, it } from 'vitest'
import type { Agent, AgentTool, ResourceMetadata, ScenarioDefinition } from '@/domain'
import { DEFAULT_MODE, conditionsFor, describeDraft, isExperimentMode, readDraft, validateDraft, writeDraft } from './model'
import { equivalenceRows } from './rows'

const scenario: ScenarioDefinition = { id: 's1', categoryId: 'tool_misuse', title: 'S one', description: 'D', input: { format: 'text', text: 'x' }, expectedBehavior: { summary: 'E' }, provenance: { source: 'mock' } }
const agent: Agent = { id: 'a1', name: 'Agent One', domain: 'finance', description: 'd' }
const resource = (id: string, extra: Partial<ResourceMetadata> = {}): ResourceMetadata => ({ id, name: `R ${id}`, kind: 'table', domain: 'finance', ...extra })
const ctx = { scenarios: [scenario], agents: [agent], resources: [resource('r1'), resource('r2')] }
const ok = { scenarioId: 's1', agentId: 'a1', resourceIds: ['r1'], mode: 'paired' }

describe('draft in the URL', () => {
  it('defaults to Paired Comparison and to an empty selection', () => {
    expect(DEFAULT_MODE).toBe('paired')
    expect(readDraft(new URLSearchParams(''))).toEqual({ scenarioId: null, agentId: null, resourceIds: [], mode: 'paired' })
  })
  it('round-trips, keeping resource order, dropping blanks and duplicates', () => {
    const d = readDraft(new URLSearchParams('scenario=s1&agent=a1&resource=r2&resource=r1&resource=r2&resource=&mode=baseline'))
    expect(d).toEqual({ scenarioId: 's1', agentId: 'a1', resourceIds: ['r2', 'r1'], mode: 'baseline' })
    expect(readDraft(writeDraft(d))).toEqual(d)
  })
  it('keeps an unsupported mode as read so it can be reported, not replaced', () => {
    expect(readDraft(new URLSearchParams('mode=turbo')).mode).toBe('turbo')
    expect(isExperimentMode('turbo')).toBe(false)
  })
})

describe('modes', () => {
  it('maps each mode to its conditions, baseline first', () => {
    expect(conditionsFor('paired')).toEqual(['baseline', 'protected'])
    expect(conditionsFor('baseline')).toEqual(['baseline'])
    expect(conditionsFor('protected')).toEqual(['protected'])
  })
})

describe('validation', () => {
  it('accepts a complete configuration', () => expect(validateDraft(ok, ctx)).toEqual([]))
  it('requires a scenario, an agent and at least one resource', () => {
    const fields = validateDraft({ scenarioId: null, agentId: null, resourceIds: [], mode: 'paired' }, ctx).map((i) => i.field)
    expect(fields).toEqual(['scenario', 'agent', 'resources'])
  })
  it('rejects ids the services did not return', () => {
    const issues = validateDraft({ scenarioId: 'nope', agentId: 'ghost', resourceIds: ['r1', 'zzz'], mode: 'paired' }, ctx)
    expect(issues.map((i) => i.message).join('\n')).toMatch(/“nope” is not in the scenario catalogue[\s\S]*“ghost” is not a known agent[\s\S]*“zzz” is not a known resource/)
  })
  it('rejects an unsupported mode', () => {
    expect(validateDraft({ ...ok, mode: 'turbo' }, ctx)).toEqual([{ field: 'mode', message: '“turbo” is not a supported experiment mode.' }])
  })
  it('does not restrict resources to the agent’s domain', () => {
    const c = { ...ctx, resources: [resource('h1', { domain: 'health' })] }
    expect(validateDraft({ ...ok, resourceIds: ['h1'] }, c)).toEqual([])
  })
  it('cannot be completed when there are no resources at all', () => {
    expect(validateDraft(ok, { ...ctx, resources: [] }).map((i) => i.field)).toEqual(['resources'])
  })
})

describe('plain-data description', () => {
  it('states that it is a provisional draft and is not sent', () => {
    const tools: AgentTool[] = [{ id: 't1', agentId: 'a1', name: 'T', description: 'd', actionKind: 'read', simulated: true }, { id: 't2', agentId: 'other', name: 'U', description: 'd', actionKind: 'read', simulated: true }]
    expect(describeDraft(ok, { ...ctx, tools })).toEqual({
      provisionalFrontendDraft: true, sentToBackend: false, scenarioId: 's1', agent: { id: 'a1', name: 'Agent One', domain: 'finance' },
      resourceIds: ['r1'], mode: 'paired', conditions: ['baseline', 'protected'], toolIds: ['t1'],
    })
  })
})

describe('equivalence rows', () => {
  it('always covers the five things that must stay equivalent', () => {
    expect(equivalenceRows({}).map((r) => r.aspect)).toEqual([
      'Scenario and attack input', 'Agent and model configuration', 'Identity and permissions', 'Resource snapshots', 'Available tools and task context',
    ])
  })
  it('describes the configured choices when they are known', () => {
    const rows = equivalenceRows({ scenario, agent, resources: [resource('r1'), resource('r2')], tools: [{ id: 't', agentId: 'a1', name: 'Reader', description: '', actionKind: 'read', simulated: true }] })
    expect(rows[0]?.same).toMatch(/S one/)
    expect(rows[1]?.same).toMatch(/Agent One/)
    expect(rows[3]?.same).toMatch(/2 resources/)
    expect(rows[4]?.same).toMatch(/1 tool \(Reader\)/)
  })
})
