import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { toneTile, toneTint, type Tone } from './tones'

type CardTone = 'default' | 'raised' | 'inset'
type CardPadding = 'none' | 'md' | 'lg'

const tones: Record<CardTone, string> = {
  default: 'border-line bg-surface shadow-card',
  raised: 'border-line-strong bg-raised shadow-card',
  inset: 'border-line bg-raised/60',
}
const paddings: Record<CardPadding, string> = {
  none: '',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export interface CardProps extends ComponentProps<'div'> {
  tone?: CardTone
  /** Soft pastel wash instead of plain Slate. Use to give a card a category. */
  tint?: Tone
  padding?: CardPadding
}

export function Card({ tone = 'default', tint, padding = 'md', className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border',
        tint ? ['shadow-card', toneTint[tint]] : tones[tone],
        paddings[padding],
        className,
      )}
      {...rest}
    />
  )
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  icon?: ReactNode
  /** Pastel of the icon tile. Defaults to lavender (brand). */
  iconTone?: Tone
  action?: ReactNode
  /** Heading level to render, so page outlines stay correct. */
  as?: Extract<ElementType, 'h2' | 'h3' | 'h4'>
  className?: string
}

export function CardHeader({
  title,
  description,
  eyebrow,
  icon,
  iconTone = 'lavender',
  action,
  as: Heading = 'h3',
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start gap-4', className)}>
      {icon && (
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', toneTile[iconTone])}>
          {icon}
        </div>
      )}
      <div className="min-w-56 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {eyebrow}
          </p>
        )}
        <Heading className="text-heading font-semibold text-fg">{title}</Heading>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
