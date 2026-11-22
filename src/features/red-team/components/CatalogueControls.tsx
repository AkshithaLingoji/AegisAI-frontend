import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CategoryOption } from '../catalogue/scenarioFilter'

export interface CatalogueControlsProps {
  query: string
  onQuery: (q: string) => void
  categoryId: string | null
  onCategory: (id: string | null) => void
  options: CategoryOption[]
  total: number
}

export function CatalogueControls({ query, onQuery, categoryId, onCategory, options, total }: CatalogueControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="rt-search" className="mb-1.5 block text-sm font-medium text-fg">Search scenarios</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            id="rt-search"
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Title, ID, description or category"
            autoComplete="off"
            className="rt-input"
          />
        </div>
      </div>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={categoryId === null} onClick={() => onCategory(null)} className={cn('rt-chip', categoryId === null && 'rt-chip-active')}>
          All <span className="rt-chip-count">{total}</span>
        </button>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={categoryId === o.id} onClick={() => onCategory(o.id)} data-category-filter={o.id} className={cn('rt-chip', categoryId === o.id && 'rt-chip-active')}>
            {o.label} <span className="rt-chip-count">{o.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
