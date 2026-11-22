import type { ScenarioDefinition } from '@/domain'
import { categoryLabel } from '../data/plannedCategories'

export interface CategoryOption {
  id: string
  label: string
  count: number
}

/** Categories present in the returned scenarios (never a fixed list), sorted by label. */
export function categoryOptions(scenarios: readonly ScenarioDefinition[]): CategoryOption[] {
  const counts = new Map<string, number>()
  for (const s of scenarios) counts.set(s.categoryId, (counts.get(s.categoryId) ?? 0) + 1)
  return [...counts].map(([id, count]) => ({ id, label: categoryLabel(id), count })).sort((a, b) => a.label.localeCompare(b.label))
}

const norm = (v: string) => v.toLowerCase().replace(/[_-]+/g, ' ')

/** Everything the search looks at: title, ID, description and category (id and label). */
function haystack(s: ScenarioDefinition): string {
  return norm([s.title ?? '', s.id, s.description, s.categoryId, categoryLabel(s.categoryId)].join('\n'))
}

/** Every whitespace-separated term must appear somewhere in the searched fields (case-insensitive). */
export function matchesQuery(s: ScenarioDefinition, query: string): boolean {
  const terms = norm(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const h = haystack(s)
  return terms.every((t) => h.includes(t))
}

export function filterScenarios(scenarios: readonly ScenarioDefinition[], filter: { query: string; categoryId: string | null }): ScenarioDefinition[] {
  return scenarios.filter((s) => (filter.categoryId === null || s.categoryId === filter.categoryId) && matchesQuery(s, filter.query))
}

/** The name to show for a scenario: its title when it has one, else its ID. */
export const scenarioName = (s: Pick<ScenarioDefinition, 'id' | 'title'>): string => (s.title && s.title.trim() !== '' ? s.title : s.id)
