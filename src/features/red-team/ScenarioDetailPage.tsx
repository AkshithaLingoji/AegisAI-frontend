import { ArrowLeft, Ban } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, ExpandableDetails, StatePanel } from '@/components/ui'
import type { ScenarioDefinition } from '@/domain'
import { RedTeamServiceError } from '@/services'
import { scenarioName } from './catalogue/scenarioFilter'
import { LibraryError, LibraryLoading } from './components/LibraryError'
import { ProvenanceBadge } from './components/ProvenanceBadge'
import { FieldList, JsonBlock } from './components/StructuredInput'
import { categoryLabel } from './data/plannedCategories'
import { useRedTeamScenario } from './hooks'

function Block({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={className ?? 'space-y-3'}>
      <h2 id={id} className="text-heading font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function Detail({ scenario }: { scenario: ScenarioDefinition }) {
  const { input, expectedBehavior: eb } = scenario
  const label = categoryLabel(scenario.categoryId)
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Scenario" title={scenarioName(scenario)} />

      <dl className="grid gap-4 sm:grid-cols-3" aria-label="Scenario identity">
        <div data-meta="id">
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Scenario ID</dt>
          <dd className="mt-1 font-mono text-sm text-fg">{scenario.id}</dd>
        </div>
        <div data-meta="category">
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Attack category</dt>
          <dd className="mt-1 text-sm text-fg">
            {label}
            {label !== scenario.categoryId && <span className="ml-2 font-mono text-xs text-fg-subtle">{scenario.categoryId}</span>}
          </dd>
        </div>
        <div data-meta="provenance">
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Data provenance</dt>
          <dd className="mt-1">
            <ProvenanceBadge provenance={scenario.provenance} />
            {scenario.provenance.runId && <span className="ml-2 font-mono text-xs text-fg-subtle">{scenario.provenance.runId}</span>}
          </dd>
        </div>
      </dl>

      <Block id="rt-d-desc" title="Description">
        <p className="max-w-3xl text-base leading-relaxed text-fg-muted">{scenario.description}</p>
      </Block>

      <Block id="rt-d-input" title="Input to the system under test">
        <p className="text-sm text-fg-subtle">Shown exactly as supplied. It is displayed as text only and is never run or interpreted here.</p>
        {input.format === 'text' ? (
          <pre className="rt-pre" data-input-format="text">{input.text}</pre>
        ) : (
          <div data-input-format="structured" className="space-y-3">
            <FieldList fields={input.fields} label="Structured input fields" />
            <ExpandableDetails summary="Raw structured input (JSON)">
              <JsonBlock value={input.fields} />
            </ExpandableDetails>
          </div>
        )}
      </Block>

      <section aria-labelledby="rt-d-exp" className="rt-spec space-y-3 p-5" data-expected-behavior>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="rt-d-exp" className="text-heading font-semibold text-fg">Expected secure behaviour</h2>
          <Badge tone="neutral">Specification, not a result</Badge>
        </div>
        <p className="max-w-3xl text-base leading-relaxed text-fg">{eb.summary}</p>
        {eb.details && Object.keys(eb.details).length > 0 && <FieldList fields={eb.details} label="Expected behaviour details" />}
        <p className="text-sm text-fg-subtle">This describes what a well-protected system should do. It does not say that anything has happened.</p>
      </section>

      <section aria-labelledby="rt-d-exec" className="rt-neutral-panel flex gap-4 p-5" data-execution-note>
        <Ban className="mt-1 size-5 shrink-0 text-fg-muted" aria-hidden />
        <div className="space-y-1.5">
          <h2 id="rt-d-exec" className="text-heading font-semibold text-fg">Execution: none recorded</h2>
          <p className="text-sm leading-relaxed text-fg-muted">
            This scenario has not been run from here, and there is no outcome, evidence or score to show. Starting scenarios and reading their results arrive in later
            patches and need the Red-Team backend.
          </p>
        </div>
      </section>
    </div>
  )
}

export function ScenarioDetailPage() {
  const { scenarioId = '' } = useParams()
  const location = useLocation()
  const scenario = useRedTeamScenario(scenarioId)
  const back = `/red-team/scenarios${location.search}`

  return (
    <div className="space-y-8">
      <Link to={back} data-back-link className="rt-back inline-flex items-center gap-2 text-sm font-medium">
        <ArrowLeft className="size-4" aria-hidden /> Scenario Catalogue
      </Link>
      {scenario.isPending && <LibraryLoading title="Loading the scenario…" />}
      {scenario.isError &&
        (scenario.error instanceof RedTeamServiceError && scenario.error.code === 'not-found' ? (
          <div data-catalogue-state="not-found">
            <StatePanel variant="empty" title="Scenario not found" description={scenario.error.message} className="py-10" />
          </div>
        ) : (
          <LibraryError error={scenario.error} subject="The scenario" onRetry={() => void scenario.refetch()} />
        ))}
      {scenario.data && <Detail scenario={scenario.data} />}
    </div>
  )
}
