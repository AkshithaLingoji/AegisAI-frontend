import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import { Button, Card, StageTransition, Stepper, type StepperStep } from '@/components/ui'

export interface WorkspaceAction {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export interface DemoWorkspaceProps {
  /** Short identifier, e.g. "FIN-01". */
  eyebrow: string
  title: string
  /** Heading level of the title: h2 on its own page, h3 when nested in a section. */
  titleAs?: 'h2' | 'h3'
  /** One or two sentences: what the user is about to see. */
  summary: string
  /** Short, practical "what to do" line shown above the stepper. */
  instruction: ReactNode
  /** Badges such as the simulated-data label. */
  meta?: ReactNode
  steps: StepperStep[]
  currentIndex: number
  onStepSelect?: (index: number) => void
  stageTitle: string
  stageDescription?: string
  /** The current stage's content (one stage at a time, in a large card). */
  children: ReactNode
  /** Back is always bottom-left, the primary action always bottom-right. */
  onBack?: () => void
  primaryAction: WorkspaceAction
}

/**
 * The shared frame for the four Red-Team demonstrations: dedicated workspace,
 * what-to-do guidance, visible progress, one large stage card at a time, and a
 * consistent action bar. Stage content is supplied by each demonstration.
 */
export function DemoWorkspace({
  eyebrow,
  title,
  titleAs: TitleTag = 'h2',
  summary,
  instruction,
  meta,
  steps,
  currentIndex,
  onStepSelect,
  stageTitle,
  stageDescription,
  children,
  onBack,
  primaryAction,
}: DemoWorkspaceProps) {
  const stage = steps[currentIndex]
  const StageTag = TitleTag === 'h2' ? 'h3' : 'h4'
  const stageId = stage?.id ?? String(currentIndex)
  const headingEl = useRef<HTMLHeadingElement | null>(null)
  const previousIndex = useRef(currentIndex)
  const pendingFocus = useRef(false)

  // The stage heading of a new step mounts AFTER the old one finishes animating
  // out, so focus it when it appears (see `setHeading`). If it is already in
  // place, focus it right away.
  const setHeading = useCallback((el: HTMLHeadingElement | null) => {
    headingEl.current = el
    if (el && pendingFocus.current) {
      pendingFocus.current = false
      el.focus()
    }
  }, [])

  // Compare against the previous step (not a "first render" flag) so this never
  // fires on mount — including React StrictMode's double-invoked effects, which
  // would otherwise scroll the page to this heading on load.
  useEffect(() => {
    if (previousIndex.current === currentIndex) return
    previousIndex.current = currentIndex
    if (headingEl.current?.dataset.stage === stageId) {
      headingEl.current.focus()
    } else {
      pendingFocus.current = true
    }
  }, [currentIndex, stageId])

  return (
    <div className="space-y-6">
      <Card padding="lg" tint="lavender" className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-lavender/[0.2] px-3 py-1 font-mono text-xs font-medium text-lavender">
            {eyebrow}
          </span>
          {meta}
        </div>
        <div className="space-y-2">
          <TitleTag className="text-title font-semibold text-fg">{title}</TitleTag>
          <p className="max-w-3xl text-base leading-relaxed text-fg-muted">{summary}</p>
        </div>
        <div className="flex gap-3 rounded-2xl border border-sky/25 bg-sky/[0.12] px-4 py-3.5 text-sm text-sky">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="leading-relaxed">
            <span className="font-semibold">What to do: </span>
            <span className="text-cloud">{instruction}</span>
          </p>
        </div>
      </Card>

      <Stepper steps={steps} currentIndex={currentIndex} onStepSelect={onStepSelect} className="px-1" />
      <p className="sr-only" aria-live="polite">
        Step {currentIndex + 1} of {steps.length}: {stage?.label}
      </p>

      <Card padding="lg" className="min-h-80">
        <StageTransition stageKey={stage?.id ?? String(currentIndex)}>
          <div className="space-y-6">
            <div className="space-y-1.5">
              <StageTag
                ref={setHeading}
                data-stage={stageId}
                tabIndex={-1}
                className="text-heading font-semibold text-fg outline-none"
              >
                {stageTitle}
              </StageTag>
              {stageDescription && (
                <p className="max-w-3xl text-sm leading-relaxed text-fg-muted">{stageDescription}</p>
              )}
            </div>
            {children}
          </div>
        </StageTransition>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {onBack ? (
          <Button variant="ghost" onClick={onBack} leadingIcon={<ArrowLeft className="size-4" aria-hidden />}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="lg"
          onClick={primaryAction.onClick}
          loading={primaryAction.loading}
          disabled={primaryAction.disabled}
          leadingIcon={primaryAction.icon}
          className="w-full sm:w-auto"
        >
          {primaryAction.label}
        </Button>
      </div>
    </div>
  )
}
