import { ArrowRight, Layers } from 'lucide-react'
import { SourceBadgeView, type SourceStatus } from '@/components/evidence/SourceBadge'
import { Badge, Card, CardHeader, ExpandableDetails, StatePanel } from '@/components/ui'
import type { ExecutionSource } from '@/domain'
import { configuredSource } from '@/services'
import { useSourceInfo } from '@/state/queries'

const layers = [
  { name: 'UI components', note: 'No data of their own' },
  { name: 'State + queries', note: 'Zustand · TanStack Query' },
  { name: 'Service interfaces', note: 'The only thing the UI knows' },
]

/** Live proof that data flows UI → query → service interface → selected implementation. */
export function ServiceLayerPanel() {
  const { status, data, error } = useSourceInfo()
  const view: SourceStatus = status === 'pending' ? 'loading' : status === 'error' ? 'error' : 'ready'
  const active: ExecutionSource = data?.source ?? configuredSource

  return (
    <Card padding="lg" tint="sky" className="space-y-6">
      <CardHeader
        as="h3"
        icon={<Layers className="size-5" aria-hidden />}
        iconTone="sky"
        title="Service layer"
        description="Screens never contain data. They ask a service interface, and the build setting decides whether that is the mock or the real backend. The two are never mixed."
        action={<SourceBadgeView configured={configuredSource} status={view} />}
      />

      <ol aria-label="Data flow" className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {layers.map((layer) => (
          <li key={layer.name} className="flex flex-1 items-center gap-3 lg:contents">
            <div className="flex-1 rounded-2xl border border-line bg-raised/60 px-4 py-3.5">
              <p className="text-sm font-semibold text-fg">{layer.name}</p>
              <p className="text-xs text-fg-subtle">{layer.note}</p>
            </div>
            <ArrowRight className="hidden size-4 shrink-0 self-center text-fg-subtle lg:block" aria-hidden />
          </li>
        ))}
        <li className="flex-1 rounded-2xl border border-line-strong bg-raised px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-fg">Selected implementation</p>
            <Badge tone={configuredSource === 'mock' ? 'peach' : 'mint'}>{configuredSource}</Badge>
          </div>
          <p className="text-xs text-fg-subtle">Set by VITE_AEGIS_SOURCE</p>
        </li>
      </ol>

      {status === 'pending' && <StatePanel variant="loading" title="Checking the data source…" />}
      {status === 'error' && (
        <StatePanel
          variant="error"
          title="The backend isn't available"
          description="The backend source is selected, but its adapter can't be reached. The app will not substitute mock data — fix the connection or switch the source."
        />
      )}
      {status === 'success' && data && (
        <p className="rounded-2xl bg-raised px-5 py-4 text-sm leading-relaxed text-fg-muted">{data.description}</p>
      )}

      <ExpandableDetails>
        <dl className="grid gap-x-8 gap-y-2 font-mono text-xs sm:grid-cols-[max-content_1fr]">
          <dt className="text-fg-subtle">configured source</dt>
          <dd className="text-fg">{configuredSource}</dd>
          <dt className="text-fg-subtle">reported by service</dt>
          <dd className="text-fg">{status === 'success' ? active : '—'}</dd>
          {error && (
            <>
              <dt className="text-fg-subtle">error</dt>
              <dd className="text-rose">{error.message}</dd>
            </>
          )}
        </dl>
      </ExpandableDetails>
    </Card>
  )
}
