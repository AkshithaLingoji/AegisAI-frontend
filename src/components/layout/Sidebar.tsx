import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { NAV_ITEMS } from '@/app/navigation'
import { cn } from '@/lib/cn'
import { toneTile } from '@/components/ui/tones'

/** Primary navigation. Used both as the desktop sidebar and inside the mobile drawer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const available = NAV_ITEMS.filter((item) => item.to)
  const planned = NAV_ITEMS.filter((item) => !item.to)

  return (
    <div className="flex h-full flex-col gap-8 overflow-y-auto px-5 py-6">
      <Logo />

      <nav aria-label="Primary" className="space-y-8">
        <ul className="space-y-1.5">
          {available.map(({ id, label, icon: Icon, to, tone }) => (
            <li key={id}>
              <NavLink
                to={to!}
                end={to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center gap-3 rounded-2xl px-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-lavender/[0.16] text-fg ring-1 ring-inset ring-lavender/30'
                      : 'text-fg-muted hover:bg-raised hover:text-fg',
                  )
                }
              >
                <span className={cn('flex size-9 items-center justify-center rounded-xl', toneTile[tone])}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div>
          <p className="mb-2 px-2.5 text-xs font-medium uppercase tracking-wider text-fg-subtle">
            Planned modules
          </p>
          <ul className="space-y-1">
            {planned.map(({ id, label, icon: Icon, plannedPhase, tone }) => (
              <li
                key={id}
                aria-disabled="true"
                className="flex min-h-11 items-center gap-3 rounded-2xl px-2.5 text-sm text-fg-subtle"
              >
                <span className={cn('flex size-8 items-center justify-center rounded-xl opacity-60', toneTile[tone])}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1">{label}</span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] leading-none">
                  Phase {plannedPhase}
                  <span className="sr-only"> — not built yet</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  )
}
