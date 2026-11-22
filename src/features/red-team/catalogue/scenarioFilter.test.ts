import { describe, expect, it } from 'vitest'
import type { ScenarioDefinition } from '@/domain'
import { categoryOptions, filterScenarios, matchesQuery, scenarioName } from './scenarioFilter'

const make = (id: string, categoryId: string, extra: Partial<ScenarioDefinition> = {}): ScenarioDefinition => ({
  id, categoryId, description: `Description of ${id}`, input: { format: 'text', text: 'x' }, expectedBehavior: { summary: 'S' }, provenance: { source: 'mock' }, ...extra,
})
const A = make('a-1', 'prompt_injection', { title: 'Hidden instruction', description: 'A document carries an instruction.' })
const B = make('b-2', 'tool_misuse', { title: 'Tool out of scope' })
const C = make('c-3', 'brand_new_kind')
const D = make('d-4', 'prompt_injection')
const ALL = [A, B, C, D]

describe('categoryOptions', () => {
  it('is derived from the scenarios returned, with counts, sorted by label', () => {
    expect(categoryOptions(ALL)).toEqual([
      { id: 'brand_new_kind', label: 'brand_new_kind', count: 1 },
      { id: 'prompt_injection', label: 'Prompt injection', count: 2 },
      { id: 'tool_misuse', label: 'Tool misuse', count: 1 },
    ])
  })
  it('is empty for no scenarios and shows unknown ids verbatim', () => {
    expect(categoryOptions([])).toEqual([])
    expect(categoryOptions([C])[0]?.label).toBe('brand_new_kind')
  })
})

describe('search', () => {
  it('matches title, id, description and category, case-insensitively', () => {
    expect(matchesQuery(A, 'HIDDEN')).toBe(true) // title
    expect(matchesQuery(B, 'b-2')).toBe(true) // id
    expect(matchesQuery(A, 'carries an instruction')).toBe(true) // description
    expect(matchesQuery(A, 'prompt injection')).toBe(true) // category label
    expect(matchesQuery(A, 'prompt_injection')).toBe(true) // category id
    expect(matchesQuery(C, 'brand new kind')).toBe(true) // unknown category id, separators ignored
  })
  it('requires every term to match and ignores blank queries', () => {
    expect(matchesQuery(A, 'hidden document')).toBe(true)
    expect(matchesQuery(A, 'hidden payroll')).toBe(false)
    expect(matchesQuery(A, '   ')).toBe(true)
  })
  it('does not search the expected behaviour or input', () => {
    const s = make('z', 'tool_misuse', { expectedBehavior: { summary: 'uniquewordinspec' }, input: { format: 'text', text: 'uniquewordininput' } })
    expect(matchesQuery(s, 'uniquewordinspec')).toBe(false)
    expect(matchesQuery(s, 'uniquewordininput')).toBe(false)
  })
})

describe('filterScenarios', () => {
  it('combines the category filter and the query', () => {
    expect(filterScenarios(ALL, { query: '', categoryId: null })).toEqual(ALL)
    expect(filterScenarios(ALL, { query: '', categoryId: 'prompt_injection' })).toEqual([A, D])
    expect(filterScenarios(ALL, { query: 'hidden', categoryId: 'prompt_injection' })).toEqual([A])
    expect(filterScenarios(ALL, { query: 'hidden', categoryId: 'tool_misuse' })).toEqual([])
    expect(filterScenarios(ALL, { query: '', categoryId: 'not_there' })).toEqual([])
  })
})

describe('scenarioName', () => {
  it('uses the title, else the id', () => {
    expect(scenarioName(A)).toBe('Hidden instruction')
    expect(scenarioName(C)).toBe('c-3')
    expect(scenarioName({ id: 'q', title: '  ' })).toBe('q')
  })
})
