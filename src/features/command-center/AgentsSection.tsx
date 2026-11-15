import { Landmark, Stethoscope } from 'lucide-react'
import { Badge, Card, CardHeader, ExpandableDetails } from '@/components/ui'
import { formatTimestamp } from '@/lib/format'
import type { AgentOverview } from './model'

function AgentCard({ item }: { item: AgentOverview }) {
  const { agent, principal } = item
  const Icon = agent.domain === 'health' ? Stethoscope : Landmark
  return (
    <Card padding="lg" className="flex flex-col gap-5" data-agent={agent.id}>
      <CardHeader
        eyebrow={`${String(agent.domain)} agent`}
        title={agent.name}
        description={agent.description}
        icon={<Icon className="size-5" aria-hidden />}
        iconTone="sky"
        action={<Badge tone="neutral">{agent.status ?? 'status unknown'}</Badge>}
      />

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ['Runs', item.runs],
          ['Actions proposed', item.proposed],
          ['Last run', item.lastRunAt ? formatTimestamp(item.lastRunAt) : '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-raised/60 px-2 py-3">
            <dd className="text-sm font-semibold text-fg sm:text-base">{value}</dd>
            <dt className="mt-0.5 text-xs text-fg-subtle">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="space-y-2.5">
        <p className="text-sm font-medium text-fg">Acts for</p>
        <p className="text-sm text-fg-muted">{principal?.displayName ?? 'Unknown user'}</p>
      </div>

      <div className="space-y-2.5">
        <p className="text-sm font-medium text-fg">Can use these resources</p>
        {item.permittedResources.length ? (
          <ul className="flex flex-wrap gap-2">
            {item.permittedResources.map((r) => (
              <li key={r.id}>
                <Badge tone="mint">{r.name}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-subtle">None reported.</p>
        )}
      </div>

      <ExpandableDetails>
        <dl className="grid gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-[max-content_1fr]">
          <dt className="text-fg-subtle">agent id</dt>
          <dd className="text-fg">{agent.id}</dd>
          <dt className="text-fg-subtle">user id</dt>
          <dd className="text-fg">{principal?.id ?? '—'}</dd>
          <dt className="text-fg-subtle">roles</dt>
          <dd className="text-fg">{principal?.roles.join(', ') || '—'}</dd>
          <dt className="text-fg-subtle">granted actions</dt>
          <dd className="text-fg">{principal?.scopes.join(', ') || '—'}</dd>
          <dt className="text-fg-subtle">capabilities</dt>
          <dd className="text-fg">{agent.capabilities?.join(' · ') || '—'}</dd>
        </dl>
      </ExpandableDetails>
    </Card>
  )
}

export function AgentsSection({ items }: { items: AgentOverview[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => (
        <AgentCard key={item.agent.id} item={item} />
      ))}
    </div>
  )
}
