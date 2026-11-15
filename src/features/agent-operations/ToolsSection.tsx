import { Ban, CircleCheck, FlaskConical, Wrench } from 'lucide-react'
import { Badge, Card, CardHeader } from '@/components/ui'
import type { ToolView } from './model'

function usage(t: ToolView): string {
  const u = t.uses
  if (u.proposed === 0) return 'Not used in any recorded run.'
  return `Used in ${u.proposed} proposed ${u.proposed === 1 ? 'action' : 'actions'}: ${u.executed} ran, ${u.blocked} blocked.`
}

function ToolCard({ view }: { view: ToolView }) {
  const { tool } = view
  return (
    <Card padding="lg" className="flex flex-col gap-4" data-tool={tool.id}>
      <CardHeader
        as="h3"
        title={tool.name}
        icon={<Wrench className="size-5" aria-hidden />}
        iconTone="sky"
        description={tool.description}
      />
      <div className="flex flex-wrap gap-2">
        {tool.simulated && (
          <Badge tone="peach" icon={<FlaskConical className="size-3.5" aria-hidden />}>Simulated tool</Badge>
        )}
        {view.grant === 'not-listed' ? (
          <Badge tone="red" icon={<Ban className="size-3.5" aria-hidden />}>Not on the user’s list: {tool.requiredScope}</Badge>
        ) : view.grant === 'listed' ? (
          <Badge tone="mint" icon={<CircleCheck className="size-3.5" aria-hidden />}>On the user’s list: {tool.requiredScope}</Badge>
        ) : (
          <Badge tone="neutral">No permission needed</Badge>
        )}
      </div>
      {tool.destination && (
        <p className="text-sm text-fg-muted">
          Sends to: <span className="font-mono text-xs text-fg">{tool.destination}</span>
        </p>
      )}
      <p className="mt-auto text-sm text-fg-muted">{usage(view)}</p>
    </Card>
  )
}

export function ToolsSection({ tools }: { tools: ToolView[] }) {
  if (tools.length === 0) return null
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {tools.map((t) => (
        <ToolCard key={t.tool.id} view={t} />
      ))}
    </div>
  )
}
