import type { ScenarioCategory } from '@/domain'

/** Renders whatever categories it is given: there is no per-category component. */
export function CategoryList({ categories }: { categories: ScenarioCategory[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-label="Attack categories">
      {categories.map((c) => (
        <li key={c.id} className="rt-category" data-category={c.id}>
          <h3 className="text-base font-semibold text-fg">{c.label}</h3>
          {c.description && <p className="mt-1 text-sm leading-relaxed text-fg-muted">{c.description}</p>}
        </li>
      ))}
    </ul>
  )
}
