import type { ComponentProps, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-lavender text-midnight shadow-[0_8px_20px_-10px_rgb(169_154_247/0.7)] hover:brightness-105 active:brightness-95',
  secondary: 'border border-line-strong bg-raised text-fg hover:bg-overlay',
  ghost: 'text-fg-muted hover:bg-raised hover:text-fg',
  danger: 'border border-red/55 bg-red/[0.16] text-red-pale hover:bg-red/[0.26]',
}

const sizes: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

/** Class names for non-button elements (e.g. router links) that look like buttons. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
): string {
  return cn(base, variants[variant], sizes[size])
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses(variant, size), className)}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  )
}
