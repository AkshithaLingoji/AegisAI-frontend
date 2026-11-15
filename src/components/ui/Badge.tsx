import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneBorder, toneSoftBg, toneText, type Tone } from './tones'

export interface BadgeProps extends ComponentProps<'span'> {
  tone?: Tone
  icon?: ReactNode
}

export function Badge({ tone = 'neutral', icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
        toneSoftBg[tone],
        toneBorder[tone],
        toneText[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}
