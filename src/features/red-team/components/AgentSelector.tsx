import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { Agent } from '@/domain'

export function AgentSelector({ agents, value, onChange }: { agents: readonly Agent[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-heading font-semibold text-fg">Target agent</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {agents.map((a) => {
          const checked = value === a.id
          return (
            <label key={a.id} data-agent={a.id} data-checked={checked} className={cn('rt-choice', checked && 'rt-choice-checked')}>
              <input type="radio" name="target-agent" value={a.id} checked={checked} onChange={() => onChange(a.id)} className="sr-only" />
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-fg">{a.name}</span>
                <Badge tone="neutral">{a.domain}</Badge>
              </span>
              {a.environment && <span className="mt-1 block text-xs text-fg-subtle">{a.environment}</span>}
              <span className="mt-2 block text-sm leading-relaxed text-fg-muted">{a.description}</span>
              {a.capabilities && a.capabilities.length > 0 && (
                <span className="mt-2 block text-xs text-fg-subtle">Can: {a.capabilities.join('; ')}</span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
