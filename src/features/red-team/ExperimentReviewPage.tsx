import { Link, useSearchParams } from 'react-router-dom'
import { Ban, Info, Pencil, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, ExpandableDetails } from '@/components/ui'
import { configuredSource } from '@/services'
import { scenarioName } from './catalogue/scenarioFilter'
import { ConditionComparison } from './components/ConditionComparison'
import { ConditionTag } from './components/ConditionTag'
import { ExperimentSteps } from './components/ExperimentSteps'
import { LibraryError, LibraryLoading } from './components/LibraryError'
import { ProvenanceBadge } from './components/ProvenanceBadge'
import { SensitivityBadge } from './components/ResourceSelector'
import { JsonBlock } from './components/StructuredInput'
import { conditionsFor, describeDraft, isExperimentMode, readDraft, validateDraft, writeDraft } from './configuration/model'
import { equivalenceRows } from './configuration/rows'
import { categoryRisk } from './data/categoryRisk'
import { categoryLabel } from './data/plannedCategories'
import { useExperimentOptions, useRedTeamScenarios } from './hooks'

/**
 * Review the configuration before anything could be run. Read-only: it restates what was chosen,
 * flags what deserves attention, and says plainly that nothing has started and no result exists.
 */
export function ExperimentReviewPage() {
  const [params] = useSearchParams()
  const draft = readDraft(params)
  const scenarios = useRedTeamScenarios()
  const options = useExperimentOptions()
  const configureHref = `/red-team/configure?${writeDraft(draft).toString()}`

  const header = (
    <PageHeader
      eyebrow="Red-Team Lab"
      title="Review configuration"
      description="Check the whole experiment configuration here. Nothing has been started, and there are no results."
    />
  )
  const steps = (
    <ExperimentSteps
      current="review"
      hrefs={{ catalogue: '/red-team/scenarios', ...(draft.scenarioId ? { details: `/red-team/scenarios/${encodeURIComponent(draft.scenarioId)}` } : {}), configure: configureHref }}
    />
  )

  if (scenarios.isPending || options.isPending) {
    return (
      <div className="space-y-8">
        {steps}
        {header}
        <LibraryLoading title="Loading the configuration…" />
      </div>
    )
  }
  if (scenarios.isError || options.isError) {
    return (
      <div className="space-y-8">
        {steps}
        {header}
        {scenarios.isError ? (
          <LibraryError error={scenarios.error} subject="The scenario library" onRetry={() => void scenarios.refetch()} />
        ) : (
          options.isError && <LibraryError error={options.error} subject="The agent and resource data" onRetry={() => void options.refetch()} />
        )}
      </div>
    )
  }

  const ctx = { scenarios: scenarios.data, agents: options.data.agents, resources: options.data.resources }
  const { tools } = options.data
  const issues = validateDraft(draft, ctx)

  if (issues.length > 0) {
    return (
      <div className="space-y-8">
        {steps}
        {header}
        <div role="alert" className="rt-warning space-y-3" data-review-incomplete>
          <p className="text-heading font-semibold">This configuration is incomplete, so it cannot be reviewed yet</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {issues.map((i) => (
              <li key={`${i.field}-${i.message}`} data-issue={i.field}>{i.message}</li>
            ))}
          </ul>
          <Link to={configureHref} className="rt-chip">Back to configuration</Link>
        </div>
      </div>
    )
  }

  const scenario = scenarios.data.find((s) => s.id === draft.scenarioId)!
  const agent = options.data.agents.find((a) => a.id === draft.agentId)!
  const resources = options.data.resources.filter((r) => draft.resourceIds.includes(r.id))
  const mode = isExperimentMode(draft.mode) ? draft.mode : 'paired'
  const conditions = conditionsFor(mode)
  const risk = categoryRisk(scenario.categoryId)
  const agentTools = tools.filter((t) => t.agentId === agent.id)
  const restricted = resources.filter((r) => r.sensitivity === 'restricted')
  const otherDomain = resources.filter((r) => r.domain !== agent.domain)

  const warnings: { key: string; text: React.ReactNode }[] = []
  if (conditions.includes('baseline')) {
    warnings.push({ key: 'baseline-unprotected', text: <>The <strong>Baseline</strong> condition deliberately runs <strong>without AegisAI protection</strong>. Use synthetic resources only.</> })
  }
  if (mode !== 'paired') {
    warnings.push({ key: 'single-condition', text: <>Only <strong>{mode === 'baseline' ? 'Baseline' : 'Protected'}</strong> is selected, so there is nothing to compare it against. Paired Comparison is recommended.</> })
  }
  if (restricted.length > 0) {
    warnings.push({ key: 'restricted', text: <>{restricted.length} selected {restricted.length === 1 ? 'resource is' : 'resources are'} marked restricted: {restricted.map((r) => r.name).join(', ')}.</> })
  }
  if (otherDomain.length > 0) {
    warnings.push({ key: 'other-domain', text: <>{otherDomain.map((r) => r.name).join(', ')} {otherDomain.length === 1 ? 'belongs' : 'belong'} to a different domain than {agent.name}. That can be deliberate for an attack scenario; check it is intended.</> })
  }
  if (configuredSource === 'mock') {
    warnings.push({ key: 'mock', text: <><strong>Illustrative data.</strong> The scenario, agent and resources come from the development mock.</> })
  }

  const json = describeDraft(draft, { ...ctx, tools })

  return (
    <div className="space-y-10">
      {steps}
      {header}

      <section aria-labelledby="rt-r-summary" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="rt-r-summary" className="text-title font-semibold text-fg">Configuration summary</h2>
          <Link to={configureHref} className="rt-chip" data-edit-link><Pencil className="size-4" aria-hidden /> Edit configuration</Link>
        </div>
        <dl className="rt-summary" aria-label="Configuration summary">
          <div data-summary="scenario">
            <dt>Scenario</dt>
            <dd>
              <Link to={`/red-team/scenarios/${encodeURIComponent(scenario.id)}`} className="rt-back font-semibold">{scenarioName(scenario)}</Link>
              <span className="mt-1 block font-mono text-xs text-fg-subtle">{scenario.id}</span>
              <span className="mt-2 flex flex-wrap gap-2">
                <Badge tone="lavender">{categoryLabel(scenario.categoryId)}</Badge>
                <ProvenanceBadge provenance={scenario.provenance} />
              </span>
            </dd>
          </div>
          <div data-summary="agent">
            <dt>Target agent</dt>
            <dd>
              <span className="font-semibold text-fg">{agent.name}</span>
              <span className="mt-1 block text-sm text-fg-muted">{agent.domain}{agent.environment ? ` · ${agent.environment}` : ''}</span>
            </dd>
          </div>
          <div data-summary="resources">
            <dt>Synthetic resources ({resources.length})</dt>
            <dd>
              <ul className="space-y-1.5">
                {resources.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm text-fg">
                    {r.name} <SensitivityBadge level={r.sensitivity} />
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div data-summary="mode">
            <dt>Experiment mode</dt>
            <dd>
              <span className="font-semibold text-fg">{mode === 'paired' ? 'Paired Comparison' : mode === 'baseline' ? 'Baseline' : 'Protected'}</span>
              <span className="mt-2 flex flex-wrap gap-2">
                {conditions.map((c) => (
                  <ConditionTag key={c} condition={c} />
                ))}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {mode === 'paired' && (
        <section aria-labelledby="rt-r-compare" className="space-y-3" data-paired-review>
          <h2 id="rt-r-compare" className="text-title font-semibold text-fg">The comparison this sets up</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
            Both conditions must start from equivalent footing; the one intended difference is whether AegisAI protection is active. This describes the experiment design, not an outcome.
          </p>
          <ConditionComparison rows={equivalenceRows({ scenario, agent, resources, tools })} />
        </section>
      )}

      <section aria-labelledby="rt-r-tools" className="space-y-3">
        <h2 id="rt-r-tools" className="text-heading font-semibold text-fg">Tools the agent has</h2>
        {agentTools.length === 0 ? (
          <p className="text-sm text-fg-muted">The tool service lists no tools for this agent.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2" aria-label="Agent tools">
            {agentTools.map((t) => (
              <li key={t.id} className="rt-neutral-panel p-3 text-sm">
                <span className="font-semibold text-fg">{t.name}</span> <span className="text-fg-subtle">({t.actionKind}{t.simulated ? ', simulated' : ''})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {risk && (
        <section aria-labelledby="rt-r-risk" className="rt-risk space-y-1" data-organisational-risk>
          <h2 id="rt-r-risk" className="text-heading font-semibold text-fg">Organisational risk (general)</h2>
          <p className="text-sm leading-relaxed text-fg">{risk}</p>
          <p className="text-xs text-fg-subtle">Describes what this kind of attack puts at risk. It is not a finding about this agent, and it does not say whether anything was blocked or succeeded.</p>
        </section>
      )}

      {warnings.length > 0 && (
        <section aria-labelledby="rt-r-warn" className="space-y-3">
          <h2 id="rt-r-warn" className="text-heading font-semibold text-fg">Before this could be run</h2>
          <ul className="space-y-2" aria-label="Warnings">
            {warnings.map((w) => (
              <li key={w.key} data-warning={w.key} className="rt-warning flex gap-3 text-sm leading-relaxed">
                {w.key === 'mock' ? <Info className="mt-0.5 size-5 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
                <span>{w.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="rt-r-exec" className="rt-neutral-panel flex gap-4 p-5" data-execution-note>
        <Ban className="mt-1 size-5 shrink-0 text-fg-muted" aria-hidden />
        <div className="space-y-1.5">
          <h2 id="rt-r-exec" className="text-heading font-semibold text-fg">Execution: not started</h2>
          <p className="text-sm leading-relaxed text-fg-muted">
            Starting an experiment is not built into this frontend yet and needs the Red-Team backend. No attack has been run, no result exists, and none is implied by this
            configuration.
          </p>
        </div>
      </section>

      <ExpandableDetails summary="Configuration as plain data (provisional, not sent anywhere)">
        <p className="mb-3 text-sm text-fg-subtle">This is only what the frontend currently collects. It is not a backend request, and the backend’s real contract is not confirmed.</p>
        <JsonBlock value={json} />
      </ExpandableDetails>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <Link to={configureHref} className="rt-chip">Edit configuration</Link>
        <Link to="/red-team/scenarios" className="rt-chip">Back to the catalogue</Link>
      </div>
    </div>
  )
}
