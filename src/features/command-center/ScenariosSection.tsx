import { CircleCheck, Lock, TriangleAlert } from 'lucide-react'
import { ConditionBadge } from '@/components/evidence/ConditionBadge'
import { Badge, Card, CardHeader } from '@/components/ui'
import type { Condition, RunOutcome, ScenarioOverview } from './model'
import { VerdictBadge } from './VerdictBadge'

function OutcomeRow({ condition, run }: { condition: Condition; run?: RunOutcome }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-raised/60 px-4 py-3">
      <ConditionBadge condition={condition} />
      {run ? (
        <>
          <VerdictBadge verdict={run.verdict} />
          <span className="text-sm text-fg-muted">
            {run.executed} of {run.proposed} actions ran
          </span>
        </>
      ) : (
        <span className="text-sm text-fg-subtle">Not run yet</span>
      )}
    </li>
  )
}

function ScenarioCard({ item }: { item: ScenarioOverview }) {
  const { scenario } = item
  const adversarial = scenario.category === 'adversarial'
  return (
    <Card padding="lg" className="flex flex-col gap-5" data-scenario={scenario.id}>
      <CardHeader
        eyebrow={scenario.id}
        title={scenario.title}
        icon={adversarial ? <TriangleAlert className="size-5" aria-hidden /> : <CircleCheck className="size-5" aria-hidden />}
        iconTone={adversarial ? 'peach' : 'mint'}
        action={
          <Badge tone={adversarial ? 'peach' : 'mint'}>{adversarial ? 'Contains an attack' : 'Everyday task'}</Badge>
        }
      />
      <p className="text-sm leading-relaxed text-fg-muted">{scenario.summary}</p>
      <figure className="rounded-2xl border-l-4 border-lavender bg-raised/60 px-4 py-3">
        <figcaption className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">Original request</figcaption>
        <blockquote className="text-sm leading-relaxed text-fg">“{scenario.task.prompt}”</blockquote>
      </figure>
      <ul aria-label={`${scenario.id} outcomes`} className="space-y-2.5">
        <OutcomeRow condition="baseline" run={item.baseline} />
        <OutcomeRow condition="protected" run={item.protected} />
      </ul>
      <p className="mt-auto flex items-center gap-2 text-xs text-fg-subtle">
        <Lock className="size-3.5 shrink-0" aria-hidden />
        The guided walkthrough for this scenario arrives in the Red-Team Lab (Phase 5).
      </p>
    </Card>
  )
}

export function ScenariosSection({ items }: { items: ScenarioOverview[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {items.map((item) => (
        <ScenarioCard key={item.scenario.id} item={item} />
      ))}
    </div>
  )
}
