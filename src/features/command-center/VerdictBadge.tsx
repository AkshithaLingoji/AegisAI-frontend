import { CircleCheck, ShieldX, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui'
import type { RunVerdict } from './model'

const config = {
  'within-scope': { tone: 'mint', label: 'All actions within scope', icon: CircleCheck },
  'out-of-scope-executed': { tone: 'peach', label: 'Out-of-scope action ran', icon: TriangleAlert },
  'out-of-scope-blocked': { tone: 'red', label: 'Out-of-scope action blocked', icon: ShieldX },
} as const

/** Meaning is carried by the icon and the words, never by colour alone. */
export function VerdictBadge({ verdict }: { verdict: RunVerdict }) {
  const { tone, label, icon: Icon } = config[verdict]
  return (
    <Badge tone={tone} data-verdict={verdict} icon={<Icon className="size-3.5" aria-hidden />}>
      {label}
    </Badge>
  )
}
