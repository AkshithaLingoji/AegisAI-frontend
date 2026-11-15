import { ConditionBadge, CONDITION_COPY } from '@/components/evidence/ConditionBadge'
import { SideBySide } from '@/components/ui'
import { plural } from '@/lib/format'
import type { Condition, CommandCenterModel, ConditionTotals } from './model'

function rows(condition: Condition, t: ConditionTotals): [string, string | number][] {
  return [
    ['Runs', t.runs],
    ['Actions proposed', t.proposed],
    ['Actions that ran', t.executed],
    ['Actions blocked', t.blocked],
    ['Out-of-scope actions that ran', t.outOfScopeExecuted],
    ['Out-of-scope actions blocked', t.outOfScopeBlocked],
    [
      'Policy checks',
      condition === 'baseline' ? 'None (no assurance layer)' : `${t.allowed} allowed · ${t.denied} denied`,
    ],
  ]
}

function headline(condition: Condition, t: ConditionTotals): string {
  if (t.outOfScopeProposed === 0) return 'No out-of-scope actions were proposed.'
  const n = plural(t.outOfScopeProposed, 'out-of-scope action')
  return condition === 'baseline'
    ? `${t.outOfScopeExecuted} of ${n} ran.`
    : `${t.outOfScopeBlocked} of ${n} ${t.outOfScopeBlocked === 1 ? 'was' : 'were'} blocked before running.`
}

function Panel({ condition, totals }: { condition: Condition; totals: ConditionTotals }) {
  return (
    <>
      <p className="text-sm leading-relaxed text-fg-muted">{CONDITION_COPY[condition].summary}</p>
      <p className="rounded-2xl bg-raised/70 px-4 py-3 text-base font-semibold text-fg">{headline(condition, totals)}</p>
      <dl className="divide-y divide-line text-sm">
        {rows(condition, totals).map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="text-right font-medium tabular-nums text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/** Same scenarios, same data, same attack payload, shown side by side. */
export function ComparisonSection({ model }: { model: CommandCenterModel }) {
  const { baseline, protected: prot } = model.totals
  return (
    <div className="space-y-5">
      <SideBySide
        left={{
          label: CONDITION_COPY.baseline.name,
          tint: 'neutral',
          badge: <ConditionBadge condition="baseline" />,
          children: <Panel condition="baseline" totals={baseline} />,
        }}
        right={{
          label: CONDITION_COPY.protected.name,
          tint: 'sky',
          badge: <ConditionBadge condition="protected" />,
          children: <Panel condition="protected" totals={prot} />,
        }}
      />
      <p className="text-sm leading-relaxed text-fg-subtle">
        Both conditions use the same scenarios, the same starting data and the same agent proposals. These figures are
        counted from the simulated run records below, so they are demonstration results, not backend security evidence.
      </p>
    </div>
  )
}
