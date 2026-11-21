import { describe, expect, it } from 'vitest'
import type { TaskDefinition } from '@/domain'
import { emptyDraft } from '@/state/guidedStore'
import { MAX_INPUT_BYTES, buildCustomTask, decisionKey, inputBytes, validateDraft } from './model'

const template = { id: 'FIN-01', origin: 'catalogue', domain: 'finance', title: 'T', summary: 's', request: 'r', agentId: 'agent-finance', actingPrincipalId: 'user-finance-analyst', selectedResourceIds: ['fin-expenses-q3'], inputs: [] } as TaskDefinition
const draft = (over = {}) => ({ ...emptyDraft(), name: 'Name', request: 'Do it', scenarioId: 'FIN-01', ...over })

describe('decision wording', () => {
  it('normalises the four known decisions and leaves anything else as “other”', () => {
    expect(decisionKey('allow')).toBe('allow')
    expect(decisionKey('REQUIRE-APPROVAL')).toBe('require_approval')
    expect(decisionKey('escalate')).toBe('other')
    expect(decisionKey(null)).toBe('none')
  })
})

describe('custom task drafting', () => {
  it('builds the task with the request verbatim and every input untrusted by default', () => {
    const d = draft({ request: '  keep\r\nthis  ', inputs: [{ key: 'k', label: '', format: 'csv', content: ' a,b\n ' }] })
    const task = buildCustomTask(d, template)
    expect(task.origin).toBe('custom')
    expect(task.request).toBe('  keep\r\nthis  ')
    expect(task.inputs[0]).toMatchObject({ content: ' a,b\n ', label: 'Input 1', trust: { level: 'untrusted', assignedBy: 'default' } })
    expect(task.agentId).toBe(template.agentId)
  })
  it('requires a name, a request and a script', () => {
    const v = validateDraft(draft({ name: ' ', request: '', scenarioId: '' }), undefined)
    expect(v.valid).toBe(false)
    expect(v.issues).toHaveLength(3)
    expect(validateDraft(draft(), template).valid).toBe(true)
  })
  it('measures size in UTF-8 bytes and rejects (never truncates) over the limit', () => {
    expect(inputBytes('€')).toBe(3)
    expect(inputBytes('x\ud800')).toBeNull()
    const big = 'a'.repeat(MAX_INPUT_BYTES + 1)
    const v = validateDraft(draft({ inputs: [{ key: 'big', label: 'Big', format: 'text', content: big }] }), template)
    expect(v.valid).toBe(false)
    expect(v.inputIssues.big![0]).toMatch(/will not be truncated/)
    const exact = validateDraft(draft({ inputs: [{ key: 'ok', label: 'Ok', format: 'text', content: 'a'.repeat(MAX_INPUT_BYTES) }] }), template)
    expect(exact.valid).toBe(true)
    const euro = validateDraft(draft({ inputs: [{ key: 'e', label: 'E', format: 'text', content: '€'.repeat(Math.floor(MAX_INPUT_BYTES / 3) + 1) }] }), template)
    expect(euro.valid).toBe(false)
  })
  it('allows five inputs but not six', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, label: `L${i}`, format: 'text' as const, content: 'x' }))
    expect(validateDraft(draft({ inputs: mk(5) }), template).valid).toBe(true)
    expect(validateDraft(draft({ inputs: mk(6) }), template).valid).toBe(false)
  })
})
