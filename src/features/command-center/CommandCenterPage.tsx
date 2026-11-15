import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button, StatePanel } from '@/components/ui'
import { ActivitySection } from './ActivitySection'
import { AgentsSection } from './AgentsSection'
import { ComparisonSection } from './ComparisonSection'
import { OverviewSection } from './OverviewSection'
import { ResourcesSection } from './ResourcesSection'
import { ScenariosSection } from './ScenariosSection'
import { useCommandCenter } from './useCommandCenter'

export function CommandCenterPage() {
  const query = useCommandCenter()
  const model = query.data

  return (
    <div className="space-y-14">
      <PageHeader
        eyebrow="Overview"
        title="Command Center"
        description="See what the two demonstration agents did, with and without AegisAI's protection. All figures are counted from simulated run records."
      />

      {query.isPending && (
        <StatePanel
          variant="loading"
          title="Loading the overview…"
          description="Fetching agents, scenarios and run records."
          className="py-20"
        />
      )}

      {query.isError && (
        <StatePanel
          variant="error"
          title="The overview couldn't be loaded"
          description={
            <>
              {query.error.message} The app does not substitute mock data when the selected source is unavailable.
            </>
          }
          action={
            <Button variant="secondary" onClick={() => query.refetch()} leadingIcon={<RefreshCw className="size-4" aria-hidden />}>
              Try again
            </Button>
          }
          className="py-16"
        />
      )}

      {model && model.counts.runs === 0 && (
        <StatePanel
          variant="empty"
          title="No runs recorded yet"
          description="There is nothing to summarise until at least one scenario has run."
          className="py-16"
        />
      )}

      {model && model.counts.runs > 0 && (
        <>
          <Section id="overview" title="At a glance" tone="lavender" description="The headline numbers, counted from the runs below.">
            <OverviewSection model={model} />
          </Section>

          <Section
            id="comparison"
            title="Baseline vs Protected"
            tone="sky"
            description="The same four scenarios were run twice: once without AegisAI's assurance layer, once with it."
          >
            <ComparisonSection model={model} />
          </Section>

          <Section
            id="scenarios"
            title="The four scenarios"
            tone="lavender"
            description="Two everyday tasks and two where something tries to push an agent outside what the user is allowed to do."
          >
            <ScenariosSection items={model.scenarios} />
          </Section>

          <Section
            id="activity"
            title="Activity"
            tone="peach"
            description="What stood out, and every run in order."
          >
            <ActivitySection model={model} />
          </Section>

          <Section id="agents" title="Agents" tone="sky" description="Who did the work, and on whose behalf.">
            <AgentsSection items={model.agents} />
          </Section>

          <Section
            id="resources"
            title="Resources"
            tone="mint"
            description="The synthetic data the agents could reach, who may use it, and what was recorded against it."
          >
            <ResourcesSection items={model.resources} />
          </Section>
        </>
      )}
    </div>
  )
}
