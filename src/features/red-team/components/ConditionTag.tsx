import { ShieldCheck, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Condition } from '../configuration/model'

const LABEL: Record<Condition, string> = {
  baseline: 'Baseline: no AegisAI protection',
  protected: 'Protected: AegisAI active',
}

/** The one place the Baseline (red) and Protected (teal) identity is defined. Always icon + text, never colour alone. */
export function ConditionTag({ condition, short, className }: { condition: Condition; short?: boolean; className?: string }) {
  const Icon = condition === 'baseline' ? ShieldOff : ShieldCheck
  return (
    <span className={cn('rt-cond', `rt-cond-${condition}`, className)} data-condition={condition}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {short ? (condition === 'baseline' ? 'Baseline' : 'Protected') : LABEL[condition]}
    </span>
  )
}
