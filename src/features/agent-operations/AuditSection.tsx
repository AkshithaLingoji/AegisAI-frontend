import { ShieldAlert } from 'lucide-react'
import { ConditionBadge } from '@/components/evidence/ConditionBadge'
import { Card, CardHeader, ExpandableDetails, StatePanel } from '@/components/ui'
import { formatTimestamp, plural } from '@/lib/format'
import { DecisionBadge, OutcomeBadge } from './badges'
import type { AgentAuditView } from './model'

function Row({ item }: { item: AgentAuditView }) {
  const { record } = item
  const outcome = record.outcome === 'executed' ? 'executed' : record.outcome === 'blocked' ? 'blocked' : 'unknown'
  return (
    <li className="space-y-2.5 rounded-2xl bg-raised/60 px-4 py-3.5" data-audit={record.id}>
      <p className="text-sm font-medium text-fg">{record.action}</p>
      <div className="flex flex-wrap items-center gap-2">
        {(item.condition === 'baseline' || item.condition === 'protected') && <ConditionBadge condition={item.condition} />}
        <DecisionBadge decision={record.decision} />
        <OutcomeBadge outcome={outcome} outOfScope={item.needsAttention} />
      </div>
      <p className="text-xs text-fg-subtle">
        {formatTimestamp(record.timestamp)}
        {item.scenarioId ? ` · ${item.scenarioId}` : ''}
        {item.resourceName ? ` · ${item.resourceName}` : ''}
      </p>
      {record.evidenceRefs && (
        <p className="break-all font-mono text-[11px] text-fg-subtle">{record.evidenceRefs.join(' · ')}</p>
      )}
    </li>
  )
}

export function AuditSection({ items }: { items: AgentAuditView[] }) {
  if (items.length === 0) {
    return <StatePanel variant="empty" title="No audit events" description="Nothing is recorded for this agent yet." />
  }
  const attention = items.filter((i) => i.needsAttention)
  return (
    <div className="space-y-5">
      <Card tint={attention.length ? 'peach' : undefined} padding="lg" className="space-y-5" data-audit-group="attention">
        <CardHeader
          as="h3"
          title="Needs attention"
          icon={<ShieldAlert className="size-5" aria-hidden />}
          iconTone="peach"
          description="Records that aimed at a resource the user is not listed for."
        />
        {attention.length ? (
          <ul aria-label="Audit events needing attention" className="space-y-3">
            {attention.map((i) => (
              <Row key={i.record.id} item={i} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">None. Every recorded action targeted a resource the user is listed for.</p>
        )}
      </Card>
      <ExpandableDetails summary={`All ${plural(items.length, 'audit record')}, newest first`}>
        <ul aria-label="All audit records" className="space-y-3">
          {items.map((i) => (
            <Row key={i.record.id} item={i} />
          ))}
        </ul>
      </ExpandableDetails>
    </div>
  )
}
