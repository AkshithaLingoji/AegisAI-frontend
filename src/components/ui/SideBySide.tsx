import type { ReactNode } from 'react'
import { Card } from './Card'
import type { Tone } from './tones'

export interface Side {
  label: string
  tint?: Tone
  badge?: ReactNode
  children: ReactNode
}

/** Two equally weighted panels; stacks on small screens. Used for Baseline vs Protected. */
export function SideBySide({ left, right }: { left: Side; right: Side }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[left, right].map((side) => (
        <Card key={side.label} tint={side.tint} padding="lg" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-heading font-semibold text-fg">{side.label}</h3>
            {side.badge}
          </div>
          {side.children}
        </Card>
      ))}
    </div>
  )
}
