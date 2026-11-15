import { ShieldX, TriangleAlert } from 'lucide-react'
import { ConditionBadge } from '@/components/evidence/ConditionBadge'
import { Card, CardHeader, StatePanel, Timeline, type TimelineItem } from '@/components/ui'
import { formatTimestamp } from '@/lib/format'
import type { CommandCenterModel } from './model'
import { VerdictBadge } from './VerdictBadge'

export function ActivitySection({ model }: { model: CommandCenterModel }) {
  const items: TimelineItem[] = model.notable.map((n) => ({
    id: n.id,
    tone: n.outcome === 'blocked' ? 'red' : 'peach',
    icon:
      n.outcome === 'blocked' ? <ShieldX className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />,
    title: `${n.summary} — ${n.outcome === 'blocked' ? 'blocked' : 'ran'}`,
    meta: `${n.scenarioId} · ${n.condition === 'baseline' ? 'Baseline' : 'Protected'} · ${formatTimestamp(n.timestamp)}`,
    description: `Target: ${n.resourceName}. ${n.reason}`,
  }))

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card padding="lg" className="space-y-6">
        <CardHeader
          as="h3"
          title="Out-of-scope actions"
          iconTone="peach"
          icon={<TriangleAlert className="size-5" aria-hidden />}
          description="Actions that aimed at a resource the signed-in user is not permitted to use, and what happened to each."
        />
        {items.length ? (
          <Timeline items={items} label="Out-of-scope actions, newest first" />
        ) : (
          <StatePanel variant="empty" title="No out-of-scope actions" description="Nothing in the recorded runs aimed outside a user's permissions." />
        )}
      </Card>

      <Card padding="lg" className="space-y-6">
        <CardHeader as="h3" title="Recent runs" description="Every simulated run, newest first." />
        {model.runs.length ? (
          <ul aria-label="Recent runs" className="space-y-3">
            {model.runs.map((run) => (
              <li key={run.experimentId} className="space-y-2.5 rounded-2xl bg-raised/60 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-xs font-medium text-lavender">{run.scenarioId}</span>
                  <ConditionBadge condition={run.condition} />
                  <span className="ml-auto text-xs text-fg-subtle">{formatTimestamp(run.completedAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <VerdictBadge verdict={run.verdict} />
                  <span className="text-sm text-fg-muted">
                    {run.executed} of {run.proposed} actions ran
                    {run.blocked > 0 ? `, ${run.blocked} blocked` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <StatePanel variant="empty" title="No runs recorded yet" />
        )}
      </Card>
    </div>
  )
}
