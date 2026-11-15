import type { ReactNode } from 'react'
import { toneBar, type Tone } from '@/components/ui/tones'
import { cn } from '@/lib/cn'

export function Section({
  id,
  title,
  description,
  tone = 'lavender',
  children,
}: {
  id: string
  tone?: Tone
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-6">
      <div className="space-y-2">
        <span aria-hidden className={cn('block h-1.5 w-12 rounded-full', toneBar[tone])} />
        <h2 id={id} className="text-title font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="max-w-3xl text-base leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}
