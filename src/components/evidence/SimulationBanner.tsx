import { FlaskConical } from 'lucide-react'
import type { ExecutionSource } from '@/domain'
import { configuredSource } from '@/services'

/** Persistent notice whenever results come from the development mock. */
export function SimulationBannerView({ source }: { source: ExecutionSource }) {
  if (source !== 'mock') return null
  return (
    <div
      role="note"
      className="flex items-start gap-3 border-b border-peach/50 tint-peach px-4 py-2.5 text-sm text-peach sm:px-8"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="leading-snug">
        <strong className="font-semibold">Demonstration data.</strong>{' '}
        <span className="text-peach/90">
          Everything shown is simulated by a development mock. It is not evidence from the AegisAI backend.
        </span>
      </p>
    </div>
  )
}

export function SimulationBanner() {
  return <SimulationBannerView source={configuredSource} />
}
