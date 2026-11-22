import { Badge } from '@/components/ui'
import type { LabSection } from '../data/labSections'

/** Only sections with a real page are `available`; the rest are shown as upcoming and never as links. */
export function LabSections({ sections }: { sections: LabSection[] }) {
  return (
    <ol className="space-y-3" aria-label="Red-Team Lab sections">
      {sections.map((s, i) => (
        <li key={s.id} className="rt-section flex flex-wrap items-center gap-3 px-5 py-4" data-lab-section={s.id} data-status={s.status}>
          <span className="w-6 text-sm tabular-nums text-fg-subtle" aria-hidden>{i + 1}</span>
          <div className="min-w-56 flex-1">
            <p className="text-sm font-semibold text-fg">{s.label}</p>
            <p className="text-sm text-fg-muted">{s.description}</p>
          </div>
          {s.status === 'available' ? <Badge tone="mint">Available</Badge> : <Badge tone="neutral">Upcoming</Badge>}
        </li>
      ))}
    </ol>
  )
}
