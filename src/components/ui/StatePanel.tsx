import type { ReactNode } from 'react'
import {
  CircleCheck,
  Inbox,
  LoaderCircle,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toneSoftBg, toneText, toneTint, type Tone } from './tones'

export type StateVariant = 'loading' | 'empty' | 'success' | 'denied' | 'error'

const config: Record<StateVariant, { icon: LucideIcon; tone: Tone; role: 'status' | 'alert' }> = {
  loading: { icon: LoaderCircle, tone: 'sky', role: 'status' },
  empty: { icon: Inbox, tone: 'neutral', role: 'status' },
  success: { icon: CircleCheck, tone: 'mint', role: 'status' },
  // "Denied" is an expected, healthy outcome of a protection — not a malfunction.
  denied: { icon: ShieldX, tone: 'red', role: 'status' },
  error: { icon: TriangleAlert, tone: 'peach', role: 'alert' },
}

export interface StatePanelProps {
  variant: StateVariant
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** One consistent treatment for loading, empty, success, denied and error states. */
export function StatePanel({ variant, title, description, action, className }: StatePanelProps) {
  const { icon: Icon, tone, role } = config[variant]
  return (
    <div
      role={role}
      data-state-variant={variant}
      className={cn(
        'flex flex-col items-center gap-4 rounded-card border px-6 py-10 text-center',
        toneTint[tone],
        className,
      )}
    >
      <div className={cn('flex size-14 items-center justify-center rounded-full', toneSoftBg[tone], toneText[tone])}>
        <Icon className={cn('size-7', variant === 'loading' && 'animate-spin')} aria-hidden />
      </div>
      <div className="max-w-md space-y-1.5">
        <p className="text-heading font-semibold text-fg">{title}</p>
        {description && <p className="text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
