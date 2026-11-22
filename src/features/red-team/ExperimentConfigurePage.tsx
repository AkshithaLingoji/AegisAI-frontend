import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Info, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, StatePanel } from '@/components/ui'
import { configuredSource } from '@/services'
import { scenarioName } from './catalogue/scenarioFilter'
import { AgentSelector } from './components/AgentSelector'
import { ConditionComparison } from './components/ConditionComparison'
import { ConditionTag } from './components/ConditionTag'
import { ExperimentSteps } from './components/ExperimentSteps'
import { LibraryError, LibraryLoading } from './components/LibraryError'
import { ModeSelector } from './components/ModeSelector'
import { ProvenanceBadge } from './components/ProvenanceBadge'
import { ResourceSelector } from './components/ResourceSelector'
import { DEFAULT_MODE, isExperimentMode, readDraft, validateDraft, writeDraft, type ExperimentDraft } from './configuration/model'
import { equivalenceRows } from './configuration/rows'
import { categoryLabel } from './data/plannedCategories'
import { categoryRisk } from './data/categoryRisk'
import { useExperimentOptions, useRedTeamScenarios } from './hooks'

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="text-title font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Configure an experiment: scenario, target agent, synthetic resources and mode. The draft lives in
 * the URL (?scenario=&agent=&resource=&mode=), so it is shareable and survives back/forward.
 * Nothing is sent anywhere and nothing is run: this page only collects a configuration to review.
 */
export function ExperimentConfigurePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const draft = readDraft(params)
  const scenarios = useRedTeamScenarios()
  const options = useExperimentOptions()
  const [attempted, setAttempted] = useState(false)

  const update = (patch: Partial<ExperimentDraft>) => setParams(writeDraft({ ...draft, ...patch }), { replace: true })

  const header = (
    <PageHeader
      eyebrow="Red-Team Lab"
      title="Configure experiment"
      description="Choose what to test, which agent to test it on, which synthetic resources it may touch, and whether to compare with and without AegisAI protection."
    />
  )
  const stepsFor = (scenarioId: string | null) => (
    <ExperimentSteps
      current="configure"
      hrefs={{ catalogue: '/red-team/scenarios', ...(scenarioId ? { details: `/red-team/scenarios/${encodeURIComponent(scenarioId)}` } : {}), configure: `/red-team/configure?${params.toString()}` }}
    />
  )

  if (scenarios.isPending || options.isPending) {
    return (
      <div className="space-y-8">
        {stepsFor(draft.scenarioId)}
        {header}
        <LibraryLoading title="Loading scenarios, agents and resources…" />
      </div>
    )
  }
  if (scenarios.isError || options.isError) {
    return (
      <div className="space-y-8">
        {stepsFor(draft.scenarioId)}
        {header}
        {scenarios.isError ? (
          <LibraryError error={scenarios.error} subject="The scenario library" onRetry={() => void scenarios.refetch()} />
        ) : (
          options.isError && <LibraryError error={options.error} subject="The agent and resource data" onRetry={() => void options.refetch()} />
        )}
      </div>
    )
  }
  const { data: scenarioList } = scenarios
  const { agents, resources, tools } = options.data
  const scenario = scenarioList.find((s) => s.id === draft.scenarioId)
  const agent = agents.find((a) => a.id === draft.agentId)
  const selectedResources = resources.filter((r) => draft.resourceIds.includes(r.id))
  const issues = validateDraft(draft, { scenarios: scenarioList, agents, resources })
  const risk = scenario ? categoryRisk(scenario.categoryId) : null
  const mode = isExperimentMode(draft.mode) ? draft.mode : null

  if (scenarioList.length === 0) {
    return (
      <div className="space-y-8">
        {stepsFor(null)}
        {header}
        <div data-catalogue-state="empty">
          <StatePanel
            variant="empty"
            title="There are no scenarios to configure"
            description="The source returned no scenarios, and none is invented. Experiments are configured from catalogue scenarios."
            action={<Link to="/red-team/scenarios" className="rt-chip">Open the Scenario Catalogue</Link>}
            className="py-10"
          />
        </div>
      </div>
    )
  }

  const toggleResource = (id: string) => update({ resourceIds: draft.resourceIds.includes(id) ? draft.resourceIds.filter((r) => r !== id) : [...draft.resourceIds, id] })
  const goReview = () => {
    if (issues.length > 0) {
      setAttempted(true)
      return
    }
    navigate(`/red-team/review?${writeDraft(draft).toString()}`)
  }

  return (
    <div className="space-y-10">
      {stepsFor(draft.scenarioId)}
      {header}

      {configuredSource === 'mock' && (
        <div className="rt-note flex gap-3" data-illustrative-note>
          <Info className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
          <p className="text-sm leading-relaxed">
            <strong>Illustrative data.</strong> The scenarios, agents and synthetic resources below come from the development mock. This page only collects a configuration:
            it does not run an experiment, and no result is produced.
          </p>
        </div>
      )}

      <Block id="rt-c-scenario" title="1. Scenario">
        <div>
          <label htmlFor="rt-scenario" className="mb-1.5 block text-sm font-medium text-fg">Scenario from the catalogue</label>
          <select id="rt-scenario" className="rt-input rt-select" value={scenario ? scenario.id : ''} onChange={(e) => update({ scenarioId: e.target.value || null })}>
            <option value="">Choose a scenario…</option>
            {scenarioList.map((s) => (
              <option key={s.id} value={s.id}>{scenarioName(s)} ({categoryLabel(s.categoryId)})</option>
            ))}
          </select>
          {draft.scenarioId && !scenario && (
            <p className="mt-2 text-sm text-fg" data-scenario-missing>“{draft.scenarioId}” is not in the catalogue, so it cannot be configured.</p>
          )}
        </div>
        {scenario && (
          <div className="rt-card" data-selected-scenario={scenario.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="lavender">{categoryLabel(scenario.categoryId)}</Badge>
              <ProvenanceBadge provenance={scenario.provenance} />
            </div>
            <p className="mt-3 text-heading font-semibold text-fg">{scenarioName(scenario)}</p>
            <p className="mt-1 font-mono text-xs text-fg-subtle">ID: {scenario.id}</p>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{scenario.description}</p>
            <div className="rt-spec mt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Expected secure behaviour (a specification, not a result)</p>
              <p className="mt-1 text-sm text-fg-muted">{scenario.expectedBehavior.summary}</p>
            </div>
            {risk && (
              <div className="rt-risk mt-4" data-organisational-risk>
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  <TriangleAlert className="size-4" aria-hidden /> Organisational risk (general)
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{risk}</p>
                <p className="mt-1 text-xs text-fg-subtle">Describes what this kind of attack puts at risk. It is not a finding about any agent.</p>
              </div>
            )}
            <p className="mt-4 text-sm">
              <Link to={`/red-team/scenarios/${encodeURIComponent(scenario.id)}`} className="rt-back">View scenario details</Link>
            </p>
          </div>
        )}
      </Block>

      <Block id="rt-c-agent" title="2. Target agent">
        {agents.length === 0 ? (
          <div data-catalogue-state="no-agents">
            <StatePanel variant="empty" title="No agents are defined" description="The agent service returned none, and none is invented, so an experiment cannot be configured yet." className="py-8" />
          </div>
        ) : (
          <AgentSelector agents={agents} value={agent ? agent.id : null} onChange={(id) => update({ agentId: id })} />
        )}
        {draft.agentId && !agent && agents.length > 0 && <p className="text-sm text-fg" data-agent-missing>“{draft.agentId}” is not a known agent.</p>}
      </Block>

      <Block id="rt-c-resources" title="3. Synthetic resources">
        {resources.length === 0 ? (
          <div data-catalogue-state="no-resources">
            <StatePanel
              variant="empty"
              title="No synthetic resources are available"
              description="The resource service returned none. Without a defined set of resources there is no starting snapshot, so a configuration cannot be completed. Which resources a scenario needs has not been confirmed with the backend."
              className="py-8"
            />
          </div>
        ) : (
          <ResourceSelector resources={resources} tools={tools} agent={agent} selected={draft.resourceIds} onToggle={toggleResource} />
        )}
      </Block>

      <Block id="rt-c-mode" title="4. Experiment mode">
        <ModeSelector value={draft.mode} onChange={(m) => update({ mode: m })} />
        {mode === 'paired' && (
          <div className="space-y-3" data-paired-explainer>
            <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">
              A paired comparison runs the same scenario twice. For the result to mean anything, the Baseline and Protected runs must use equivalent inputs and setup; the one intended
              difference is whether AegisAI protection is active.
            </p>
            <ConditionComparison rows={equivalenceRows({ scenario, agent, resources: selectedResources, tools })} />
          </div>
        )}
        {mode && mode !== 'paired' && (
          <div className="rt-warning flex gap-3" data-single-condition-warning>
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-sm leading-relaxed">
              <ConditionTag condition={mode} short className="mr-2" /> A single condition gives nothing to compare against. Paired Comparison is recommended
              {draft.mode !== DEFAULT_MODE && ' and can be selected above'}.
            </p>
          </div>
        )}
        {!mode && <p className="text-sm text-fg" data-mode-invalid>“{draft.mode}” is not a supported experiment mode. Choose one above.</p>}
      </Block>

      {attempted && issues.length > 0 && (
        <div role="alert" className="rt-warning space-y-2" data-config-issues>
          <p className="font-semibold">This configuration is not complete yet:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {issues.map((i) => (
              <li key={`${i.field}-${i.message}`} data-issue={i.field}>{i.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <Button onClick={goReview}>Review configuration</Button>
        <Link to={scenario ? `/red-team/scenarios/${encodeURIComponent(scenario.id)}` : '/red-team/scenarios'} className="rt-chip">
          {scenario ? 'Back to scenario details' : 'Back to the catalogue'}
        </Link>
        <p className="text-sm text-fg-subtle">Reviewing does not start anything.</p>
      </div>
    </div>
  )
}
