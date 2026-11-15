import { Ban, CircleCheck, CircleHelp, Hourglass, UserCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, type Tone } from '@/components/ui'
import { cn } from '@/lib/cn'
import { DECISION_ORDER, type DecisionKey, type NormalisedDecision } from './model'
import type { PolicyDecisionKey } from '@/domain'

export interface DecisionCopy {
  label: string
  /** The four meanings given in the product brief. */
  meaning: string
  tone: Tone
  icon: ReactNode
  className?: string
}

const ic = 'size-3.5'
export const DECISION_COPY: Record<PolicyDecisionKey, DecisionCopy> = {
  ALLOW: { label: 'ALLOW', meaning: 'The action meets the demonstration rules.', tone: 'mint', icon: <CircleCheck className={ic} aria-hidden /> },
  DENY: { label: 'DENY', meaning: 'The action violates a demonstration rule.', tone: 'red', icon: <Ban className={ic} aria-hidden /> },
  REQUIRE_APPROVAL: {
    label: 'REQUIRE APPROVAL',
    meaning: 'Additional human authorization is required before the action could go ahead.',
    tone: 'neutral',
    icon: <UserCheck className={ic} aria-hidden />,
    className: 'border-fg-muted/50',
  },
  DEFER: {
    label: 'DEFER',
    meaning: 'The evaluation cannot safely conclude with the information available.',
    tone: 'neutral',
    icon: <Hourglass className={ic} aria-hidden />,
    className: 'border-dashed border-fg-muted/60',
  },
}

export function PolicyDecisionBadge({ decision, className }: { decision: NormalisedDecision; className?: string }) {
  if (decision.key === 'OTHER') {
    return (
      <Badge tone="neutral" data-decision="OTHER" icon={<CircleHelp className={ic} aria-hidden />} className={className}>
        {decision.raw}
      </Badge>
    )
  }
  const c = DECISION_COPY[decision.key]
  return (
    <Badge tone={c.tone} data-decision={decision.key} icon={c.icon} className={cn(c.className, className)}>
      {c.label}
    </Badge>
  )
}

export const decisionLabel = (k: DecisionKey) => (k === 'OTHER' ? 'Other' : DECISION_COPY[k].label)
export { DECISION_ORDER }
