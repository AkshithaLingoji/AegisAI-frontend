import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Horizontally scrollable content that keyboard users can reach and scroll
 * (WCAG: scrollable regions must be focusable) and that screen readers can name.
 */
export function ScrollRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cn('overflow-x-auto', className)}>
      {children}
    </div>
  )
}
