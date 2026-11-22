import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export type ExperimentStep = 'catalogue' | 'details' | 'configure' | 'review'

export interface ExperimentStepsProps {
  current: ExperimentStep
  /** Where each earlier step lives, so the path back is always one click. */
  hrefs: { catalogue: string; details?: string; configure?: string }
}

const STEPS: { id: ExperimentStep; label: string }[] = [
  { id: 'catalogue', label: 'Scenario Catalogue' },
  { id: 'details', label: 'Scenario details' },
  { id: 'configure', label: 'Configure experiment' },
  { id: 'review', label: 'Review configuration' },
]

export function ExperimentSteps({ current, hrefs }: ExperimentStepsProps) {
  const at = STEPS.findIndex((s) => s.id === current)
  return (
    <nav aria-label="Experiment steps">
      <ol className="rt-steps">
        {STEPS.map((s, i) => {
          const href = s.id === 'catalogue' ? hrefs.catalogue : s.id === 'details' ? hrefs.details : s.id === 'configure' ? hrefs.configure : undefined
          const isCurrent = s.id === current
          return (
            <li key={s.id} data-step={s.id} className={cn('rt-step', isCurrent && 'rt-step-current', i < at && 'rt-step-done')}>
              <span className="rt-step-num" aria-hidden>{i + 1}</span>
              {isCurrent || !href || i > at ? (
                <span aria-current={isCurrent ? 'step' : undefined}>{s.label}</span>
              ) : (
                <Link to={href}>{s.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
