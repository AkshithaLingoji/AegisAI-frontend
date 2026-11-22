import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Info } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatePanel } from '@/components/ui'
import { categoryOptions, filterScenarios } from './catalogue/scenarioFilter'
import { CatalogueControls } from './components/CatalogueControls'
import { ConnectionBadge } from './components/ConnectionPanel'
import { LibraryError, LibraryLoading } from './components/LibraryError'
import { ScenarioCard } from './components/ScenarioCard'
import { useRedTeamScenarios, useRedTeamStatus } from './hooks'

/**
 * Browse, search and inspect adversarial scenario DEFINITIONS. Listing a scenario does not
 * run it: nothing here starts an execution, and no result, severity or score is shown.
 * The search text and category filter live in the URL (?q=…&category=…) so a view can be
 * shared and survives going back from a scenario's detail page.
 */
export function ScenarioCataloguePage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const categoryId = params.get('category')
  const scenarios = useRedTeamScenarios()
  const status = useRedTeamStatus()

  const setParam = (name: 'q' | 'category', value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }
  const clear = () => setParams(new URLSearchParams(), { replace: true })

  const all = scenarios.data
  const options = useMemo(() => (all ? categoryOptions(all) : []), [all])
  const shown = useMemo(() => (all ? filterScenarios(all, { query, categoryId }) : []), [all, query, categoryId])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Red-Team Lab"
        title="Scenario Catalogue"
        description="The adversarial scenarios the lab can draw on: what each one attempts, what it feeds the system under test, and how a well-protected system is expected to behave."
        actions={status.data && <ConnectionBadge status={status.data} />}
      />

      <div className="rt-note flex gap-3" data-no-execution-note>
        <Info className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
        <p className="text-sm leading-relaxed">
          These are scenario <strong>definitions</strong>. Listing one does not mean it has been run: no scenario has been executed or evaluated from this page, and the
          expected behaviour shown is a specification, not a result. Guided Tasks demonstrates normal workflows and Assurance shows policy decisions; this catalogue is only
          for deliberately adversarial scenarios.
        </p>
      </div>

      {scenarios.isPending && <LibraryLoading title="Loading the scenario library…" />}
      {scenarios.isError && <LibraryError error={scenarios.error} subject="The scenario library" onRetry={() => void scenarios.refetch()} />}

      {all && all.length === 0 && (
        <div data-catalogue-state="empty">
          <StatePanel variant="empty" title="The source returned no scenarios" description="There is nothing to browse yet. No scenarios are invented to fill this page." className="py-10" />
        </div>
      )}

      {all && all.length > 0 && (
        <section aria-label="Scenario library" className="space-y-5">
          <CatalogueControls
            query={query}
            onQuery={(q) => setParam('q', q)}
            categoryId={categoryId}
            onCategory={(id) => setParam('category', id)}
            options={options}
            total={all.length}
          />
          <p role="status" className="text-sm text-fg-muted" data-result-count>
            Showing {shown.length} of {all.length} {all.length === 1 ? 'scenario' : 'scenarios'}
          </p>
          {shown.length === 0 ? (
            <div data-catalogue-state="no-results">
              <StatePanel
                variant="empty"
                title="No scenarios match"
                description="Nothing matches the current search and category filter."
                action={<button type="button" onClick={clear} className="rt-chip">Clear search and filters</button>}
                className="py-10"
              />
            </div>
          ) : (
            <ul aria-label="Scenarios" className="grid gap-4 md:grid-cols-2">
              {shown.map((s) => (
                <ScenarioCard key={s.id} scenario={s} search={params.toString() ? `?${params.toString()}` : ''} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
