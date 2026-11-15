import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, buttonClasses, Card, CardHeader } from '@/components/ui'
import { formatTimestamp, plural } from '@/lib/format'
import { agentPath, agentStyle } from './agentStyle'
import { DataSourceTag, DecisionBadge, OutcomeBadge, StatusBadge } from './badges'
import type { AgentWorkspace } from './model'

export function AgentCard({ workspace }: { workspace: AgentWorkspace }) {
  const { agent, totals } = workspace
  const style = agentStyle(agent)
  const recent = workspace.audit.slice(0, 3)
  const tasks = workspace.previousTasks

  return (
    <Card tint={style.tone} padding="lg" className="flex flex-col gap-6" data-agent-card={agent.id}>
      <CardHeader
        as="h2"
        eyebrow={`${style.domainLabel} agent`}
        title={agent.name}
        description={agent.description}
        icon={<style.Icon className="size-6" aria-hidden />}
        iconTone={style.tone}
      />

      <div className="flex flex-wrap gap-2">
        <DataSourceTag />
        <StatusBadge status={agent.status} />
        {agent.environment && <Badge tone="neutral">{agent.environment}</Badge>}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Runs', totals.runs],
          ['Actions proposed', totals.proposed],
          ['Actions that ran', totals.executed],
          ['Actions blocked', totals.blocked],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-raised/60 px-3 py-3 text-center">
            <dd className="text-xl font-semibold tabular-nums text-fg">{value}</dd>
            <dt className="mt-0.5 text-xs text-fg-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-fg">Available resources</h3>
        {workspace.permittedResources.length ? (
          <ul className="flex flex-wrap gap-2" aria-label={`${agent.name} permitted resources`}>
            {workspace.permittedResources.map((r) => (
              <li key={r.resource.id}>
                <Badge tone="mint">{r.resource.name}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">None reported.</p>
        )}
        {workspace.restrictedResources.length > 0 && (
          <p className="text-sm text-fg-muted">
            Plus {plural(workspace.restrictedResources.length, 'restricted resource')} the user is not permitted to use:{' '}
            {workspace.restrictedResources.map((r) => r.resource.name).join(', ')}.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-fg">Assigned tasks</h3>
        {tasks.length ? (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.scenario.id} className="rounded-2xl bg-raised/60 px-4 py-3 text-sm">
                <span className="font-mono text-xs font-medium text-lavender">{t.scenario.id}</span>{' '}
                <span className="font-medium text-fg">{t.scenario.title}</span>
                <span className="block text-fg-muted">“{t.prompt}”</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">No tasks recorded.</p>
        )}
      </div>

      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-fg">Recent activity</h3>
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((a) => (
              <li key={a.record.id} className="space-y-2 rounded-2xl bg-raised/60 px-4 py-3">
                <p className="text-sm text-fg">{a.record.action}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <DecisionBadge decision={a.record.decision} />
                  <OutcomeBadge outcome={a.record.outcome === 'executed' ? 'executed' : a.record.outcome === 'blocked' ? 'blocked' : 'unknown'} outOfScope={a.needsAttention} />
                  <span className="text-xs text-fg-subtle">{formatTimestamp(a.record.timestamp)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">No activity recorded.</p>
        )}
      </div>

      <Link
        to={agentPath(agent.id)}
        className={`${buttonClasses('primary')} mt-auto self-start`}
        aria-label={`Open ${agent.name} workspace`}
      >
        Open workspace
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  )
}
