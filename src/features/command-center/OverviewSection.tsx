import { Bot, FlaskConical, ShieldX, TriangleAlert } from 'lucide-react'
import { StatTile } from '@/components/ui'
import { plural } from '@/lib/format'
import type { CommandCenterModel } from './model'

export function OverviewSection({ model }: { model: CommandCenterModel }) {
  const { counts, totals, agents } = model
  const b = totals.baseline
  const p = totals.protected
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        tone="lavender"
        icon={<Bot className="size-5" />}
        label="Agents"
        value={counts.agents}
        caption={agents.map((a) => a.agent.name).join(' and ') || 'No agents reported.'}
      />
      <StatTile
        tone="sky"
        icon={<FlaskConical className="size-5" />}
        label="Simulated runs"
        value={counts.runs}
        caption={`${plural(counts.scenarios, 'scenario')}: ${b.runs} run as Baseline, ${p.runs} as Protected.`}
      />
      <StatTile
        tone="peach"
        icon={<TriangleAlert className="size-5" />}
        label="Out-of-scope actions that ran"
        value={
          <>
            <span>{b.outOfScopeExecuted}</span>
            <span className="mx-2.5 text-base font-medium text-fg-subtle">vs</span>
            <span>{p.outOfScopeExecuted}</span>
          </>
        }
        caption={`Baseline vs Protected, out of ${plural(b.outOfScopeProposed, 'out-of-scope action')} the agents proposed.`}
      />
      <StatTile
        tone="red"
        icon={<ShieldX className="size-5" />}
        label="Actions blocked before running"
        value={p.blocked}
        caption={`In Protected runs: ${p.allowed} of ${plural(p.evaluated, 'action')} allowed, ${p.denied} denied.`}
      />
    </div>
  )
}
