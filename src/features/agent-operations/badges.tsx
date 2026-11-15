import { Ban, CircleCheck, CircleHelp, FlaskConical, Lock, LockOpen, ShieldCheck, ShieldX, Tag, TriangleAlert } from 'lucide-react'
import { SOURCE_LABEL } from '@/config/env'
import { Badge, type Tone } from '@/components/ui'
import { configuredSource } from '@/services'
import type { ProposalOutcome } from './model'

/** Labels every figure with where it came from. Mock data is always called out as such. */
export function DataSourceTag() {
  return configuredSource === 'mock' ? (
    <Badge tone="peach" data-source-tag="mock" icon={<FlaskConical className="size-3.5" aria-hidden />}>
      {SOURCE_LABEL.mock}
    </Badge>
  ) : (
    <Badge tone="mint" data-source-tag="backend" icon={<ShieldCheck className="size-3.5" aria-hidden />}>
      {SOURCE_LABEL.backend}
    </Badge>
  )
}

/** The status is whatever the record says; unknown values are shown as they are. */
export function StatusBadge({ status }: { status?: string }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not reported'
  return (
    <Badge tone="neutral" data-agent-status={status ?? 'unknown'}>
      Simulated status: {label}
    </Badge>
  )
}

export function OutcomeBadge({ outcome, outOfScope }: { outcome: ProposalOutcome; outOfScope?: boolean }) {
  if (outcome === 'blocked') {
    return <Badge tone="red" icon={<ShieldX className="size-3.5" aria-hidden />}>Blocked</Badge>
  }
  if (outcome === 'executed') {
    return outOfScope ? (
      <Badge tone="peach" icon={<TriangleAlert className="size-3.5" aria-hidden />}>Ran (out of scope)</Badge>
    ) : (
      <Badge tone="mint" icon={<CircleCheck className="size-3.5" aria-hidden />}>Ran</Badge>
    )
  }
  return <Badge tone="neutral" icon={<CircleHelp className="size-3.5" aria-hidden />}>Outcome unknown</Badge>
}

/** Policy decision, or a plain note that none was made. Unknown decisions are shown verbatim. */
export function DecisionBadge({ decision }: { decision?: string }) {
  if (!decision || decision.startsWith('not evaluated')) {
    return <Badge tone="neutral" className="border-dashed">Not checked</Badge>
  }
  if (decision === 'allow') return <Badge tone="mint" icon={<CircleCheck className="size-3.5" aria-hidden />}>Allowed</Badge>
  if (decision === 'deny') return <Badge tone="red" icon={<Ban className="size-3.5" aria-hidden />}>Denied</Badge>
  return <Badge tone="neutral">{decision}</Badge>
}

/**
 * Two separate ideas, never merged into one badge:
 *  - Access status: may THIS user use the resource? (Authorized / Restricted)
 *  - Data classification: how sensitive is the data itself? (Public / Internal / Confidential / Restricted)
 * Both are always prefixed, so a record can be "Access: Authorized" and still carry a
 * high "Classification" without the two words contradicting each other.
 */
const classificationTone: Record<string, Tone> = { public: 'neutral', internal: 'sky', confidential: 'lavender', restricted: 'peach' }

export function ClassificationBadge({ classification }: { classification?: string }) {
  if (!classification) return null
  const label = classification.charAt(0).toUpperCase() + classification.slice(1)
  return (
    <Badge tone={classificationTone[classification] ?? 'neutral'} data-classification={classification} icon={<Tag className="size-3.5" aria-hidden />}>
      Classification: {label}
    </Badge>
  )
}

export function AccessBadge({ permitted }: { permitted: boolean | undefined }) {
  if (permitted === undefined) return <Badge tone="neutral" data-access="unknown">Access: not reported</Badge>
  return permitted ? (
    <Badge tone="mint" data-access="authorized" icon={<LockOpen className="size-3.5" aria-hidden />}>Access: Authorized</Badge>
  ) : (
    <Badge tone="red" data-access="restricted" icon={<Lock className="size-3.5" aria-hidden />}>Access: Restricted</Badge>
  )
}

/** On a proposed action: the target is outside what the user is listed for. */
export function ScopeBadge({ outOfScope }: { outOfScope: boolean | undefined }) {
  if (outOfScope === undefined) return null
  return outOfScope ? <AccessBadge permitted={false} /> : null
}
