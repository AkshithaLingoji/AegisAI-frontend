import { describe, expect, it } from 'vitest'
import { createBackendServices } from '../backend'
import { NotConnectedError, RedTeamServiceError } from '../contracts'
import { createMockServices } from '../mock'

const mock = () => createMockServices().redTeam
const backend = (baseUrl?: string) => createBackendServices({ ...(baseUrl ? { baseUrl } : {}) }).redTeam

describe('mock Red-Team service (demonstration only)', () => {
  it('reports itself as the mock, never as connected', async () => {
    const s = await mock().getConnectionStatus()
    expect(s).toMatchObject({ state: 'mock', source: 'mock' })
    expect(s.detail).toMatch(/no scenario has been executed/)
  })
  it('lists a small set of clearly labelled illustrative scenarios across different categories', async () => {
    const list = await mock().listScenarios()
    expect(list.length).toBeLessThanOrEqual(5)
    expect(new Set(list.map((s) => s.categoryId)).size).toBe(list.length)
    for (const s of list) {
      expect(s.id.startsWith('demo-')).toBe(true)
      expect(s.description).toMatch(/Illustrative/)
      expect(s.provenance).toEqual({ source: 'mock' })
    }
  })
  it('gets a scenario by id and says not-found otherwise', async () => {
    expect((await mock().getScenario('demo-tool-misuse')).input.format).toBe('structured')
    await expect(mock().getScenario('nope')).rejects.toMatchObject({ code: 'not-found' })
  })
  it('returns copies: mutating a result never changes the next call', async () => {
    const a = await mock().listScenarios()
    a[0]!.description = 'tampered'
    expect((await mock().listScenarios())[0]!.description).toMatch(/Illustrative/)
  })
  it('has NO runner or evaluator: execution is refused, never faked', async () => {
    const svc = mock()
    await expect(svc.startExecution({ scenarioId: 'demo-tool-misuse' })).rejects.toMatchObject({ code: 'not-supported' })
    await expect(svc.getExecutionStatus('e1')).rejects.toMatchObject({ code: 'not-found' })
    await expect(svc.getExecutionResult('e1')).rejects.toMatchObject({ code: 'not-found' })
    await expect(svc.exportReport('r1', 'json')).rejects.toMatchObject({ code: 'not-supported' })
    await expect(svc.getReport('r1')).rejects.toBeInstanceOf(RedTeamServiceError)
  })
  it('has no execution history or reports, so the UI shows honest empty states', async () => {
    expect(await mock().listExecutions()).toEqual([])
    expect(await mock().listReports()).toEqual([])
  })
})

describe('backend Red-Team adapter when not connected', () => {
  it('answers “not connected” as a status, with the configured URL only if one was set', async () => {
    expect(await backend().getConnectionStatus()).toMatchObject({ state: 'not_connected', source: 'backend' })
    expect((await backend().getConnectionStatus()).detail).toMatch(/no VITE_AEGIS_BACKEND_URL configured/)
    expect((await backend('https://example.invalid').getConnectionStatus()).detail).toMatch(/https:\/\/example\.invalid/)
  })
  it('never claims a connection', async () => {
    expect((await backend().getConnectionStatus()).state).not.toBe('connected')
  })
  it('rejects EVERY data operation with NotConnectedError, and returns no mock data', async () => {
    const svc = backend()
    const calls: [string, () => Promise<unknown>][] = [
      ['listScenarios', () => svc.listScenarios()],
      ['getScenario', () => svc.getScenario('demo-tool-misuse')],
      ['startExecution', () => svc.startExecution({ scenarioId: 'x' })],
      ['getExecutionStatus', () => svc.getExecutionStatus('e')],
      ['getExecutionResult', () => svc.getExecutionResult('e')],
      ['listExecutions', () => svc.listExecutions()],
      ['listReports', () => svc.listReports()],
      ['getReport', () => svc.getReport('r')],
      ['exportReport', () => svc.exportReport('r', 'json')],
    ]
    for (const [name, call] of calls) {
      await expect(call(), name).rejects.toBeInstanceOf(NotConnectedError)
    }
  })
  it('is a different implementation from the mock, with no fallback between them', async () => {
    const m = createMockServices()
    const b = createBackendServices({})
    expect(b.redTeam).not.toBe(m.redTeam)
    await expect(b.redTeam.listScenarios()).rejects.toBeInstanceOf(NotConnectedError)
    expect((await m.redTeam.listScenarios()).length).toBeGreaterThan(0)
  })
})
