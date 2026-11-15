import { CircleAlert, Database, FlaskConical, LoaderCircle } from 'lucide-react'
import { SOURCE_LABEL } from '@/config/env'
import type { ExecutionSource } from '@/domain'
import { configuredSource } from '@/services'
import { useSourceInfo } from '@/state/queries'
import { Badge } from '@/components/ui'

export type SourceStatus = 'loading' | 'ready' | 'error'

/**
 * Pure presentation. "CONNECTED BACKEND" is shown only when the backend
 * source is selected AND the service confirmed it is reachable. A selected but
 * unreachable backend is shown as unavailable — never as mock, never as connected.
 */
export function SourceBadgeView({
  configured,
  status,
}: {
  configured: ExecutionSource
  status: SourceStatus
}) {
  if (status === 'loading') {
    return (
      <Badge tone="neutral" data-source={configured} icon={<LoaderCircle className="size-3.5 animate-spin" aria-hidden />}>
        Checking source…
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge tone="red" data-source={configured} icon={<CircleAlert className="size-3.5" aria-hidden />}>
        BACKEND UNAVAILABLE
      </Badge>
    )
  }
  if (configured === 'backend') {
    return (
      <Badge tone="mint" data-source="backend" icon={<Database className="size-3.5" aria-hidden />}>
        {SOURCE_LABEL.backend}
      </Badge>
    )
  }
  return (
    <Badge tone="peach" data-source="mock" icon={<FlaskConical className="size-3.5" aria-hidden />}>
      {SOURCE_LABEL.mock}
    </Badge>
  )
}

export function SourceBadge() {
  const { status, data } = useSourceInfo()
  const view: SourceStatus =
    status === 'pending' ? 'loading' : status === 'error' || !data || data.source !== configuredSource ? 'error' : 'ready'
  return <SourceBadgeView configured={configuredSource} status={view} />
}
