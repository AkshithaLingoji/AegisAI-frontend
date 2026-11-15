import { Lock, LockOpen } from 'lucide-react'
import { Card } from '@/components/ui'
import { AccessBadge, ClassificationBadge } from './badges'
import type { AgentStyle } from './agentStyle'
import type { AgentWorkspace, ResourceView } from './model'

function activity(r: ResourceView): string {
  const u = r.uses
  if (u.proposed === 0) return 'No recorded proposals touched this resource.'
  return `${u.proposed} proposed ${u.proposed === 1 ? 'action' : 'actions'} aimed here: ${u.executed} ran, ${u.blocked} blocked.`
}

function ResourceCard({ view }: { view: ResourceView }) {
  const { resource } = view
  return (
    <Card className="flex flex-col gap-3" data-resource={resource.id} data-permitted={String(view.permitted)}>
      <h4 className="text-base font-semibold text-fg">{resource.name}</h4>
      <div className="flex flex-wrap gap-2">
        <AccessBadge permitted={view.permitted} />
        <ClassificationBadge classification={resource.sensitivity ? String(resource.sensitivity) : undefined} />
      </div>
      {resource.description && <p className="text-sm leading-relaxed text-fg-muted">{resource.description}</p>}
      <p className="text-xs text-fg-subtle">
        {String(resource.kind)}
        {resource.owner ? ` · owned by ${resource.owner}` : ''}
      </p>
      <p className="mt-auto text-sm text-fg-muted">{activity(view)}</p>
    </Card>
  )
}

function Group({
  heading,
  note,
  tone,
  Icon,
  items,
  id,
}: {
  heading: string
  note: string
  tone: 'mint' | 'red'
  Icon: typeof Lock
  items: ResourceView[]
  id: string
}) {
  if (items.length === 0) return null
  return (
    <Card tint={tone} padding="lg" className="space-y-5" data-resource-group={id}>
      <div className="flex items-start gap-3">
        <Icon className={tone === 'mint' ? 'mt-1 size-5 shrink-0 text-mint' : 'mt-1 size-5 shrink-0 text-red'} aria-hidden />
        <div>
          <h3 className="text-heading font-semibold text-fg">
            {heading} <span className="text-fg-muted">({items.length})</span>
          </h3>
          <p className="mt-1 text-sm text-fg-muted">{note}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((v) => (
          <ResourceCard key={v.resource.id} view={v} />
        ))}
      </div>
    </Card>
  )
}

export function ResourcesSection({ workspace, style }: { workspace: AgentWorkspace; style: AgentStyle }) {
  const who = workspace.principal?.displayName ?? 'the user'
  return (
    <div className="space-y-5">
      <Group id="permitted" tone="mint" Icon={LockOpen} heading={style.permittedHeading} note={`Listed as permitted for ${who}.`} items={workspace.permittedResources} />
      <Group id="restricted" tone="red" Icon={Lock} heading={style.restrictedHeading} note={`Part of this environment, but not listed as permitted for ${who}. Any action aimed here is out of scope.`} items={workspace.restrictedResources} />
      <Group id="unknown" tone="mint" Icon={Lock} heading="Permission not reported" note="The identity record does not say whether these are permitted." items={workspace.unknownResources} />
    </div>
  )
}
