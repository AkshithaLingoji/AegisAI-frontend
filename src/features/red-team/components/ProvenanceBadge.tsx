import { Database, FlaskConical } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { Provenance } from '@/domain'

/** Where a scenario definition came from. A mock entry is never presented as backend data. */
export function ProvenanceBadge({ provenance }: { provenance: Provenance }) {
  return provenance.source === 'mock' ? (
    <Badge tone="peach" icon={<FlaskConical className="size-3.5" aria-hidden />} data-provenance="mock">Mock demonstration data</Badge>
  ) : (
    <Badge tone="mint" icon={<Database className="size-3.5" aria-hidden />} data-provenance="backend">Reported by backend</Badge>
  )
}
