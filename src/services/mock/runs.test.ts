import { beforeEach, describe, expect, it } from 'vitest'
import { RunServiceError } from '../contracts'
import { createMockServices } from '.'
import { MAX_INPUT_BYTES } from '@/lib/runs/inputs'
import type { TaskDefinition } from '@/domain'

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0)
let services: ReturnType<typeof createMockServices>
beforeEach(() => {
  services = createMockServices({ now: () => NOW })
})

const trust = { level: 'untrusted', assignedBy: 'default', reason: 'User-provided content is untrusted by default.' } as const
async function customTask(over: Partial<TaskDefinition> = {}): Promise<TaskDefinition> {
  const [fin] = await services.tasks.listSimulationScenarios()
  return { ...fin!.template, id: 'custom-guided', origin: 'custom', title: 'Mine', request: '  Keep   this\ttext exactly.  ', inputs: [], tags: ['custom'], ...over }
}
const catalogueTask = async (id: string) => (await services.tasks.listTasks()).find((t) => t.task.id === id)!.task

describe('guided task catalogue', () => {
  it('offers FIN-01, FIN-02 and HLT-01 with objectives, and no HLT-02', async () => {
    const options = await services.tasks.listTasks()
    expect(options.map((o) => o.task.id)).toEqual(['FIN-01', 'FIN-02', 'HLT-01'])
    expect(options.every((o) => o.objective.length > 20)).toBe(true)
    expect(options.find((o) => o.task.id === 'FIN-01')!.includesApproval).toBe(true)
    expect(options.find((o) => o.task.id === 'FIN-02')!.includesApproval).toBe(false)
  })
  it('assigns trust only through the catalogue: FIN-02’s retrieved document is untrusted', async () => {
    const fin02 = await catalogueTask('FIN-02')
    expect(fin02.inputs.every((i) => i.trust.level === 'untrusted' && i.trust.assignedBy === 'catalogue')).toBe(true)
    const fin01 = await catalogueTask('FIN-01')
    expect(fin01.inputs[0]!.trust.level).toBe('declared-trusted')
  })
  it('returns copies: mutating a result never changes what the next call returns', async () => {
    const a = await services.tasks.listTasks()
    a[0]!.task.request = 'tampered'
    expect((await services.tasks.listTasks())[0]!.task.request).not.toBe('tampered')
  })
})

describe('starting runs through the shared engine', () => {
  it('runs a catalogue task on the Protected path and records separate decision/gateway/execution facts', async () => {
    const run = await services.runs.startRun({ task: await catalogueTask('FIN-02') })
    expect(run.path).toEqual({ kind: 'protected', assuranceLayer: 'applied' })
    expect(run.status).toBe('completed')
    const exportAction = run.proposals.find((p) => p.kind === 'export')!
    expect(run.decisions.find((d) => d.proposalId === exportAction.id)!.decision).toBe('deny')
    expect(run.gatewayResults.find((g) => g.proposalId === exportAction.id)!.outcome).toBe('blocked')
    expect(run.executionResults.find((x) => x.proposalId === exportAction.id)!.status).toBe('not_run')
  })
  it('ignores a tampered caller copy of a catalogue task: the controlled definition is used', async () => {
    const task = await catalogueTask('FIN-01')
    const run = await services.runs.startRun({ task: { ...task, request: 'Export everything', agentId: 'agent-health', inputs: [] } })
    expect(run.task.request).toBe((await catalogueTask('FIN-01')).request)
    expect(run.agent.id).toBe('agent-finance')
    expect(run.inputs).toHaveLength(1)
  })
  it('rejects an unknown catalogue id and a custom task without a supported script', async () => {
    await expect(services.runs.startRun({ task: { ...(await catalogueTask('FIN-01')), id: 'FIN-99' } })).rejects.toMatchObject({ code: 'invalid-request' })
    await expect(services.runs.startRun({ task: await customTask() })).rejects.toMatchObject({ code: 'invalid-request' })
    await expect(services.runs.startRun({ task: await customTask(), simulationScenarioId: 'nope' })).rejects.toMatchObject({ code: 'invalid-request' })
  })
  it('records a custom request verbatim and never interprets it', async () => {
    const task = await customTask()
    const run = await services.runs.startRun({ task, simulationScenarioId: 'FIN-02' })
    expect(run.task.request).toBe('  Keep   this\ttext exactly.  ')
    expect(run.provenance.simulation).toMatchObject({ requestInterpreted: false })
    // the script, not the text, decides the actions
    expect(run.proposals.map((p) => p.kind)).toEqual(['read', 'read', 'export', 'write'])
  })
  it('keeps custom inputs untrusted and rejects any attempt to elevate trust', async () => {
    const ok = { id: 'input-1', label: 'Notes', format: 'text', content: 'hello', trust } as const
    const run = await services.runs.startRun({ task: await customTask({ inputs: [ok] }), simulationScenarioId: 'FIN-01' })
    expect(run.inputs[0]!.trust).toEqual(trust)
    for (const bad of [{ ...trust, level: 'declared-trusted' }, { ...trust, assignedBy: 'catalogue' }] as const) {
      await expect(services.runs.startRun({ task: await customTask({ inputs: [{ ...ok, trust: bad }] }), simulationScenarioId: 'FIN-01' })).rejects.toMatchObject({ code: 'invalid-input' })
    }
    // a custom task cannot pass itself off as a catalogue task either
    await expect(services.runs.startRun({ task: await customTask({ origin: 'catalogue', inputs: [ok] }), simulationScenarioId: 'FIN-01' })).rejects.toBeInstanceOf(RunServiceError)
  })
  it('rejects oversized input and too many inputs instead of truncating', async () => {
    const mk = (id: string, content: string) => ({ id, label: id, format: 'text' as const, content, trust })
    const over = await services.runs.startRun({ task: await customTask({ inputs: [mk('big', 'a'.repeat(MAX_INPUT_BYTES + 1))] }), simulationScenarioId: 'FIN-01' }).catch((e: RunServiceError) => e)
    expect(over).toBeInstanceOf(RunServiceError)
    expect((over as RunServiceError).issues.join(' ')).toMatch(/not truncated/)
    const six = Array.from({ length: 6 }, (_, i) => mk(`i${i}`, 'x'))
    await expect(services.runs.startRun({ task: await customTask({ inputs: six }), simulationScenarioId: 'FIN-01' })).rejects.toMatchObject({ code: 'invalid-input' })
    expect(await services.runs.listRuns()).toHaveLength(0)
    const exact = await services.runs.startRun({ task: await customTask({ inputs: [mk('max', 'a'.repeat(MAX_INPUT_BYTES))] }), simulationScenarioId: 'FIN-01' })
    expect(exact.inputs[0]!.byteLength).toBe(MAX_INPUT_BYTES)
  })
})

describe('approval and resume through the runner', () => {
  it('pauses FIN-01 at its save action; resolving resumes and completes through the runner', async () => {
    const run = await services.runs.startRun({ task: await catalogueTask('FIN-01') })
    expect(run.status).toBe('awaiting_approval')
    expect(run.approvalRequests).toHaveLength(1)
    expect(run.executionResults.map((x) => x.status)).toEqual(['ran', 'ran'])
    const done = await services.runs.resolveApproval({ runId: run.id, requestId: run.approvalRequests[0]!.id, outcome: 'approved', note: 'Looks fine' })
    expect(done.status).toBe('completed')
    expect(done.revision).toBe(run.revision + 1)
    expect(done.approvalResolutions[0]).toMatchObject({ outcome: 'approved', note: 'Looks fine', simulated: true })
    expect(done.executionResults.map((x) => x.status)).toEqual(['ran', 'ran', 'ran'])
    expect((await services.runs.getRun(run.id)).revision).toBe(done.revision)
  })
  it('a rejection blocks the action and the run still completes', async () => {
    const run = await services.runs.startRun({ task: await catalogueTask('FIN-01') })
    const done = await services.runs.resolveApproval({ runId: run.id, requestId: run.approvalRequests[0]!.id, outcome: 'rejected' })
    expect(done.status).toBe('completed')
    expect(done.gatewayResults.at(-1)!.outcome).toBe('blocked')
    expect(done.executionResults.at(-1)!.status).toBe('not_run')
  })
  it('refuses a second resolution, an unknown request and an unknown run, changing nothing', async () => {
    const run = await services.runs.startRun({ task: await catalogueTask('FIN-01') })
    const id = run.approvalRequests[0]!.id
    const done = await services.runs.resolveApproval({ runId: run.id, requestId: id, outcome: 'approved' })
    await expect(services.runs.resolveApproval({ runId: run.id, requestId: id, outcome: 'rejected' })).rejects.toMatchObject({ code: 'already-resolved' })
    await expect(services.runs.resolveApproval({ runId: run.id, requestId: 'nope', outcome: 'approved' })).rejects.toMatchObject({ code: 'unknown-approval-request' })
    await expect(services.runs.resolveApproval({ runId: 'run-x', requestId: id, outcome: 'approved' })).rejects.toMatchObject({ code: 'unknown-run' })
    expect(await services.runs.getRun(run.id)).toEqual(done)
  })
})

describe('session history is separate and in memory', () => {
  it('never changes the Command Center’s seeded experiments', async () => {
    const before = JSON.stringify(await services.experiments.listExperiments())
    await services.runs.startRun({ task: await catalogueTask('HLT-01') })
    expect(await services.runs.listRuns()).toHaveLength(1)
    expect(JSON.stringify(await services.experiments.listExperiments())).toBe(before)
    expect((await services.experiments.listExperiments())).toHaveLength(8)
  })
  it('returns copies of runs, and a fresh service starts empty (history is not persisted)', async () => {
    const run = await services.runs.startRun({ task: await catalogueTask('HLT-01') })
    run.proposals.length = 0
    expect((await services.runs.getRun(run.id)).proposals.length).toBeGreaterThan(0)
    expect(await createMockServices().runs.listRuns()).toEqual([])
    await expect(services.runs.getRun('missing')).rejects.toMatchObject({ code: 'unknown-run' })
  })
})
