import type { ReactNode } from 'react'
import { Card } from './Card'
import { toneTile, type Tone } from './tones'
import { cn } from '@/lib/cn'

export interface StatTileProps {
  label: string
  /** The headline figure. */
  value: ReactNode
  /** One plain-language line explaining the figure. */
  caption?: ReactNode
  icon: ReactNode
  tone: Tone
}

/** A large, tinted figure with a plain-language caption. */
export function StatTile({ label, value, caption, icon, tone }: StatTileProps) {
  return (
    <Card tint={tone} className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', toneTile[tone])} aria-hidden>
          {icon}
        </span>
        <p className="text-sm font-medium text-fg-muted">{label}</p>
      </div>
      <p className="text-display font-semibold tabular-nums text-fg">{value}</p>
      {caption && <p className="mt-auto text-sm leading-relaxed text-fg-muted">{caption}</p>}
    </Card>
  )
}
