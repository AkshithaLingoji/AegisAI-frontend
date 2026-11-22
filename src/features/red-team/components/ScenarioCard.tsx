import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import type { ScenarioDefinition } from '@/domain'
import { categoryLabel } from '../data/plannedCategories'
import { scenarioName } from '../catalogue/scenarioFilter'
import { ProvenanceBadge } from './ProvenanceBadge'

/** One card per scenario. The whole card is a single link to its detail page. */
export function ScenarioCard({ scenario, search }: { scenario: ScenarioDefinition; search?: string }) {
  const href = `/red-team/scenarios/${encodeURIComponent(scenario.id)}${search ?? ''}`
  return (
    <li className="rt-card" data-scenario-id={scenario.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="lavender">{categoryLabel(scenario.categoryId)}</Badge>
        <ProvenanceBadge provenance={scenario.provenance} />
      </div>
      <h2 className="mt-3 text-heading font-semibold text-fg">
        <Link to={href} className="rt-card-link">{scenarioName(scenario)}</Link>
      </h2>
      <p className="mt-1 font-mono text-xs text-fg-subtle">ID: {scenario.id}</p>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fg-muted">{scenario.description}</p>
      <div className="rt-spec mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Expected secure behaviour</p>
        <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{scenario.expectedBehavior.summary}</p>
      </div>
    </li>
  )
}
