import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface StepperStep {
  id: string
  label: string
}

export interface StepperProps {
  steps: StepperStep[]
  /** Zero-based index of the active step. */
  currentIndex: number
  /** Called when the user revisits an already-completed step. */
  onStepSelect?: (index: number) => void
  className?: string
}

/**
 * Step-by-step progress. Completed steps can be revisited; future steps cannot
 * be skipped to. Compact on small screens, full on larger ones.
 */
export function Stepper({ steps, currentIndex, onStepSelect, className }: StepperProps) {
  const total = steps.length
  const current = steps[currentIndex]

  return (
    <div className={className}>
      {/* Compact: small screens */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-fg">{current?.label}</span>
          <span className="text-fg-subtle">
            Step {currentIndex + 1} of {total}
          </span>
        </div>
        {/* One segment per step; completed segments are tappable to revisit. */}
        <ol aria-label="Progress" className="mt-1 flex gap-1.5">
          {steps.map((step, index) => {
            const done = index < currentIndex
            const active = index === currentIndex
            const bar = (
              <span
                className={cn(
                  'h-1.5 w-full rounded-full transition-colors duration-200',
                  active ? 'bg-lavender' : done ? 'bg-mint/60' : 'bg-line',
                )}
              />
            )
            return (
              <li key={step.id} aria-current={active ? 'step' : undefined} className="flex-1">
                {done && onStepSelect ? (
                  <button
                    type="button"
                    onClick={() => onStepSelect(index)}
                    aria-label={`Go back to step ${index + 1}: ${step.label}`}
                    className="flex h-10 w-full items-center"
                  >
                    {bar}
                  </button>
                ) : (
                  <span className="flex h-10 items-center">
                    {bar}
                    <span className="sr-only">
                      Step {index + 1}: {step.label}
                    </span>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Full: sm and up */}
      <ol aria-label="Steps" className="hidden sm:flex">
        {steps.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          const isLast = index === total - 1

          const circle = (
            <span
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-200',
                done && 'border-mint/50 bg-mint/[0.14] text-mint',
                active && 'border-lavender bg-lavender text-midnight ring-4 ring-lavender/25',
                !done && !active && 'border-line bg-surface text-fg-subtle',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : index + 1}
            </span>
          )
          const label = (
            <span
              className={cn(
                'max-w-28 text-center text-xs font-medium leading-snug',
                active ? 'text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle',
              )}
            >
              {step.label}
            </span>
          )

          return (
            <li
              key={step.id}
              aria-current={active ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center gap-2"
            >
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-1/2 top-5 h-px w-full',
                    done ? 'bg-mint/40' : 'bg-line',
                  )}
                />
              )}
              {done && onStepSelect ? (
                <button
                  type="button"
                  onClick={() => onStepSelect(index)}
                  aria-label={`Go back to step ${index + 1}: ${step.label}`}
                  className="flex flex-col items-center gap-2 rounded-xl hover:[&>span:first-child]:border-mint"
                >
                  {circle}
                  {label}
                </button>
              ) : (
                <>
                  {circle}
                  {label}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
