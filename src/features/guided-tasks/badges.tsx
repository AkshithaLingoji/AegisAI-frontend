import { CircleCheck, Clock, ShieldAlert, ShieldCheck, ShieldX, UserCheck, UserX } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { TrustMetadata } from '@/domain'
import type { DecisionKey } from './model'

const DECISION: Record<DecisionKey, { tone: 'mint' | 'red' | 'peach' | 'lavender' | 'neutral'; label: string; icon: typeof CircleCheck }> = {
  allow: { tone: 'mint', label: 'ALLOW', icon: ShieldCheck },
  deny: { tone: 'red', label: 'DENY', icon: ShieldX },
  require_approval: { tone: 'peach', label: 'REQUIRE APPROVAL', icon: Clock },
  defer: { tone: 'lavender', label: 'DEFER', icon: Clock },
  other: { tone: 'neutral', label: '', icon: ShieldAlert },
  none: { tone: 'neutral', label: 'NO DECISION', icon: ShieldAlert },
}

/** The recorded decision. Unknown values are shown verbatim, never reinterpreted. */
export function DecisionBadge({ decisionKey, raw }: { decisionKey: DecisionKey; raw: string | null }) {
  const c = DECISION[decisionKey]
  const Icon = c.icon
  return (
    <Badge tone={c.tone} data-decision={decisionKey} icon={<Icon className="size-3.5" aria-hidden />}>
      <span className="sr-only">Simulated evaluation: </span>
      {decisionKey === 'other' ? (raw ?? '') : c.label}
    </Badge>
  )
}

/** Trust is shown with words and an icon. `declared-trusted` is a declaration by the demonstration data, not a safety verdict. */
export function TrustBadge({ trust }: { trust: TrustMetadata }) {
  const trusted = trust.level === 'declared-trusted'
  return (
    <Badge tone={trusted ? 'sky' : 'rose'} data-trust={trust.level} icon={trusted ? <UserCheck className="size-3.5" aria-hidden /> : <UserX className="size-3.5" aria-hidden />}>
      {trusted ? 'Declared trusted (catalogue)' : trust.assignedBy === 'catalogue' ? 'Untrusted (catalogue)' : 'Untrusted by default'}
    </Badge>
  )
}

export function SimulatedBadge({ children = 'Simulated' }: { children?: string }) {
  return <Badge tone="peach">{children}</Badge>
}
export { CircleCheck }
