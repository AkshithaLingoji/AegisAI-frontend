import { ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge } from '@/components/ui'

export type Condition = 'baseline' | 'protected'

/** Plain-language definitions used wherever the two conditions are introduced. */
export const CONDITION_COPY: Record<Condition, { name: string; summary: string }> = {
  baseline: {
    name: 'Baseline',
    summary: "The agent operates without AegisAI's assurance layer.",
  },
  protected: {
    name: 'Protected',
    summary: "The agent operates with AegisAI's assurance and enforcement controls.",
  },
}

/**
 * Baseline is deliberately neutral (not "bad red") and Protected is sky blue;
 * they also differ by icon and label, so identity never relies on colour alone.
 */
export function ConditionBadge({ condition }: { condition: Condition }) {
  if (condition === 'protected') {
    return (
      <Badge tone="sky" data-condition="protected" icon={<ShieldCheck className="size-3.5" aria-hidden />}>
        Protected
      </Badge>
    )
  }
  return (
    <Badge
      tone="neutral"
      data-condition="baseline"
      className="border-dashed"
      icon={<ShieldOff className="size-3.5" aria-hidden />}
    >
      Baseline
    </Badge>
  )
}
