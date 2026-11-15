import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, StatePanel } from '@/components/ui'
import { AgentCard } from './AgentCard'
import { useAgentOperations } from './useAgentOperations'

export function AgentOperationsPage() {
  const query = useAgentOperations()
  const model = query.data

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Agent Operations"
        title="Agents"
        description="Two independent demonstration agents, each acting for a different synthetic user in its own synthetic environment. Open one to see who it acts for, what it can reach, and everything it proposed."
      />

      {query.isPending && (
        <StatePanel variant="loading" title="Loading the agents…" description="Fetching agents, identities, tools and run records." className="py-20" />
      )}

      {query.isError && (
        <StatePanel
          variant="error"
          title="The agents couldn't be loaded"
          description={<>{query.error.message} The app does not substitute mock data when the selected source is unavailable.</>}
          action={
            <Button variant="secondary" onClick={() => query.refetch()} leadingIcon={<RefreshCw className="size-4" aria-hidden />}>
              Try again
            </Button>
          }
          className="py-16"
        />
      )}

      {model && model.agents.length === 0 && (
        <StatePanel variant="empty" title="No agents reported" description="The selected source returned no agents." className="py-16" />
      )}

      {model && model.agents.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          {model.agents.map((workspace) => (
            <AgentCard key={workspace.agent.id} workspace={workspace} />
          ))}
        </div>
      )}
    </div>
  )
}
