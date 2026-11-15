import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneBorder, toneDot, toneSoftBg, toneText, type Tone } from './tones'

export interface TimelineItem {
  id: string
  title: ReactNode
  description?: ReactNode
  /** e.g. "00:02" or "Step 3" — shown beside the title. */
  meta?: ReactNode
  tone?: Tone
  /** Optional icon; falls back to a coloured dot. */
  icon?: ReactNode
}

/** Vertical execution timeline. Each item reads as a plain sentence first. */
export function Timeline({ items, label = 'Timeline' }: { items: TimelineItem[]; label?: string }) {
  return (
    <ol aria-label={label} className="relative space-y-1">
      {items.map((item, index) => {
        const tone = item.tone ?? 'neutral'
        const isLast = index === items.length - 1
        return (
          <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && <span aria-hidden className="absolute left-4 top-9 bottom-0 w-px bg-line" />}
            <span
              className={cn(
                'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border',
                toneSoftBg[tone],
                toneBorder[tone],
                toneText[tone],
              )}
            >
              {item.icon ?? <span className={cn('size-2 rounded-full', toneDot[tone])} />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-fg">{item.title}</p>
                {item.meta && <span className="font-mono text-xs text-fg-subtle">{item.meta}</span>}
              </div>
              {item.description && (
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.description}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
