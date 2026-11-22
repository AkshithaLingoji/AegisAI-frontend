import { TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Agent, AgentTool, ResourceMetadata } from '@/domain'

/** Sensitivity is shown as text plus an icon for the highest level; it is the resource's own metadata. */
export function SensitivityBadge({ level }: { level: ResourceMetadata['sensitivity'] }) {
  if (!level) return null
  return level === 'restricted' ? (
    <Badge tone="peach" icon={<TriangleAlert className="size-3.5" aria-hidden />}>Restricted</Badge>
  ) : (
    <Badge tone="neutral">{level}</Badge>
  )
}

export interface ResourceSelectorProps {
  resources: readonly ResourceMetadata[]
  tools: readonly AgentTool[]
  agent: Agent | undefined
  selected: readonly string[]
  onToggle: (id: string) => void
}

/**
 * Lists only resources the resource service actually returned. Resources in the agent's own
 * domain come first; resources from other domains stay selectable (an attack may target them)
 * but are labelled. Which resources a scenario needs is NOT confirmed by any contract, so none
 * is pre-selected or described as "relevant".
 */
export function ResourceSelector({ resources, tools, agent, selected, onToggle }: ResourceSelectorProps) {
  const same = agent ? resources.filter((r) => r.domain === agent.domain) : []
  const other = agent ? resources.filter((r) => r.domain !== agent.domain) : [...resources]
  const groups = [
    ...(agent ? [{ key: 'same', title: `Same domain as ${agent.name} (${agent.domain})`, items: same }] : []),
    { key: 'other', title: agent ? 'Other domains' : 'All synthetic resources', items: other },
  ].filter((g) => g.items.length > 0)

  const reach = (r: ResourceMetadata) => {
    const names = tools.filter((t) => (!agent || t.agentId === agent.id) && t.resourceIds?.includes(r.id)).map((t) => t.name)
    return names
  }

  return (
    <fieldset className="space-y-4">
      <legend className="text-heading font-semibold text-fg">Synthetic test resources</legend>
      <p className="text-sm text-fg-muted" data-resource-count role="status">
        {selected.length} of {resources.length} selected
        {!agent && ' · choose an agent to see which resources share its domain'}
      </p>
      {groups.map((g) => (
        <div key={g.key} className="space-y-2" data-resource-group={g.key}>
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{g.title}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((r) => {
              const checked = selected.includes(r.id)
              const tools = reach(r)
              return (
                <label key={r.id} data-resource={r.id} data-checked={checked} className={cn('rt-choice', checked && 'rt-choice-checked')}>
                  <input type="checkbox" value={r.id} checked={checked} onChange={() => onToggle(r.id)} className="sr-only" />
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-fg">{r.name}</span>
                    <SensitivityBadge level={r.sensitivity} />
                  </span>
                  <span className="mt-1 block font-mono text-xs text-fg-subtle">{r.id} · {r.kind}{r.owner ? ` · ${r.owner}` : ''}</span>
                  {r.description && <span className="mt-2 block text-sm leading-relaxed text-fg-muted">{r.description}</span>}
                  {agent && (
                    <span className="mt-2 block text-xs text-fg-subtle">
                      {tools.length > 0 ? `Reachable by: ${tools.join(', ')}` : 'No listed tool of this agent reaches it'}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </fieldset>
  )
}
