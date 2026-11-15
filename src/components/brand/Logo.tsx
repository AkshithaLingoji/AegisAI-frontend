import { cn } from '@/lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-lavender/[0.18]" />
      <path
        d="M16 6.5 24 9.6v6.1c0 4.6-3.1 7.9-8 9.8-4.9-1.9-8-5.2-8-9.8V9.6L16 6.5Z"
        className="stroke-lavender"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="15.5" r="2.2" className="fill-mint" />
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <span className="text-lg font-semibold tracking-tight text-fg">
        Aegis<span className="text-lavender">AI</span>
      </span>
    </div>
  )
}
