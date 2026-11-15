import { Badge, Card, type Tone } from '@/components/ui'
import { plural } from '@/lib/format'
import type { ResourceOverview } from './model'

const sensitivityTone: Record<string, Tone> = {
  public: 'neutral',
  internal: 'sky',
  confidential: 'lavender',
  restricted: 'peach',
}

function attemptLine(r: ResourceOverview): string {
  const a = r.attempts
  const total = a.baseline.executed + a.baseline.blocked + a.protected.executed + a.protected.blocked
  if (total === 0) return 'No out-of-scope attempts.'
  const part = (label: string, x: { executed: number; blocked: number }) =>
    [x.executed ? `${label}: ran ${x.executed}×` : '', x.blocked ? `${label}: blocked ${x.blocked}×` : '']
      .filter(Boolean)
      .join(', ')
  return `Out-of-scope attempts — ${[part('Baseline', a.baseline), part('Protected', a.protected)].filter(Boolean).join(' · ')}.`
}

function ResourceCard({ item }: { item: ResourceOverview }) {
  const { resource } = item
  const tone = sensitivityTone[String(resource.sensitivity)] ?? 'neutral'
  return (
    <Card className="flex flex-col gap-3.5" data-resource={resource.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-base font-semibold text-fg">{resource.name}</h4>
        {resource.sensitivity && <Badge tone={tone}>Classification: {String(resource.sensitivity)}</Badge>}
      </div>
      {resource.description && <p className="text-sm leading-relaxed text-fg-muted">{resource.description}</p>}
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Permitted for</dt>
          <dd className="text-fg-muted">
            {item.permittedFor.length ? item.permittedFor.join(', ') : 'No user in these scenarios'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">Recorded history</dt>
          <dd className="text-fg-muted">{attemptLine(item)}</dd>
          <dd className="text-fg-muted">
            State changed in {plural(item.changedRuns.baseline, 'Baseline run')} and{' '}
            {plural(item.changedRuns.protected, 'Protected run')}.
          </dd>
        </div>
      </dl>
    </Card>
  )
}

export function ResourcesSection({ items }: { items: ResourceOverview[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ResourceCard key={item.resource.id} item={item} />
      ))}
    </div>
  )
}
