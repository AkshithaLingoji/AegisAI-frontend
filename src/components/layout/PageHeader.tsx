import type { ReactNode } from 'react'

export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl space-y-3">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-lavender">{eyebrow}</p>
        )}
        <h1 className="text-display font-semibold text-fg">{title}</h1>
        {description && <p className="text-base leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}
