import { useCallback, useRef } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Section } from '@/components/layout/Section'
import { Button, buttonClasses, StatePanel } from '@/components/ui'
import { AuditSection } from './AuditSection'
import { IdentitySection } from './IdentitySection'
import { PermissionsSection } from './PermissionsSection'
import { ResourcesSection } from './ResourcesSection'
import { RunInspector } from './RunInspector'
import { TasksSection } from './TasksSection'
import { ToolsSection } from './ToolsSection'
import { agentStyle } from './agentStyle'
import { DataSourceTag, StatusBadge } from './badges'
import type { AgentWorkspace, Condition } from './model'
import { useRunSelection } from './selection'
import { useAgentOperations } from './useAgentOperations'

const BackLink = () => (
  <Link to="/agents" className={buttonClasses('ghost')}>
    <ArrowLeft className="size-4" aria-hidden />
    All agents
  </Link>
)

const JUMPS: [string, string][] = [
  ['identity', 'Identity'],
  ['permissions', 'Permissions'],
  ['tools', 'Tools'],
  ['resources', 'Resources'],
  ['tasks', 'Tasks'],
  ['actions', 'Proposed actions'],
  ['audit', 'Audit events'],
]

function Workspace({ workspace }: { workspace: AgentWorkspace }) {
  const style = agentStyle(workspace.agent)
  const { selection, select } = useRunSelection(workspace)
  const inspectorRef = useRef<HTMLDivElement>(null)

  /** From a task card: select the run, then bring the inspector into view and move focus to it. */
  const inspect = useCallback(
    (taskId: string, condition: Condition) => {
      select(taskId, condition)
      requestAnimationFrame(() => {
        const el = inspectorRef.current
        if (!el) return
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
        el.focus({ preventScroll: true })
      })
    },
    [select],
  )

  return (
    <div className="space-y-14">
      <div className="space-y-6">
        <nav aria-label="Breadcrumb">
          <BackLink />
        </nav>
        <PageHeader
          eyebrow={`${style.domainLabel} agent`}
          title={workspace.agent.name}
          description={workspace.agent.description}
          actions={
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <DataSourceTag />
              <StatusBadge status={workspace.agent.status} />
            </div>
          }
        />
        <nav aria-label="On this page">
          <ul className="flex flex-wrap gap-2">
            {JUMPS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex min-h-10 items-center rounded-full border border-line bg-raised px-4 text-sm text-fg-muted transition-colors hover:text-fg">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Section id="identity" tone={style.tone} title="Identity" description="Who the agent is and whose behalf it acts on.">
        <IdentitySection workspace={workspace} />
      </Section>

      <Section id="permissions" tone="mint" title="Permissions and access scope" description="What the user’s identity record lists. This app shows it; it does not enforce it.">
        <PermissionsSection workspace={workspace} />
      </Section>

      <Section id="tools" tone="sky" title="Available tools" description="What the agent is able to do. Being able to is not the same as being permitted to.">
        <ToolsSection tools={workspace.tools} />
      </Section>

      <Section id="resources" tone="lavender" title="Synthetic resources" description="The data in this agent’s environment, split by what the user is permitted to use.">
        <ResourcesSection workspace={workspace} style={style} />
      </Section>

      <Section id="tasks" tone="peach" title="Tasks" description="The requests this agent has been given. Choose a run to see exactly what it proposed.">
        <TasksSection workspace={workspace} selectedRunId={selection.run?.experimentId} onInspect={inspect} />
      </Section>

      <Section id="actions" tone="rose" title="Proposed actions and execution history" description="Each action the agent proposed in the selected run, what was decided, and what happened.">
        <RunInspector
          ref={inspectorRef}
          task={selection.task}
          run={selection.run}
          condition={selection.condition}
          onSelectCondition={(c) => selection.task && select(selection.task.scenario.id, c)}
        />
      </Section>

      <Section id="audit" tone="peach" title="Security and audit events" description="Records of this agent’s actions, derived from the same run records.">
        <AuditSection items={workspace.audit} />
      </Section>
    </div>
  )
}

export function AgentDetailPage() {
  const { agentId = '' } = useParams()
  const query = useAgentOperations()
  const workspace = query.data?.agents.find((a) => a.agent.id === agentId)

  return (
    <div className="space-y-10">
      {query.isPending && (
        <>
          <BackLink />
          <StatePanel variant="loading" title="Loading the agent…" description="Fetching identity, tools, resources and run records." className="py-20" />
        </>
      )}

      {query.isError && (
        <>
          <BackLink />
          <StatePanel
            variant="error"
            title="This agent couldn't be loaded"
            description={<>{query.error.message} The app does not substitute mock data when the selected source is unavailable.</>}
            action={
              <Button variant="secondary" onClick={() => query.refetch()} leadingIcon={<RefreshCw className="size-4" aria-hidden />}>
                Try again
              </Button>
            }
            className="py-16"
          />
        </>
      )}

      {query.data && !workspace && (
        <>
          <BackLink />
          <StatePanel variant="empty" title="Agent not found" description="No agent with this address is reported by the selected source." className="py-16" />
        </>
      )}

      {workspace && <Workspace workspace={workspace} />}
    </div>
  )
}
