import { Scale } from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { ConditionTag } from './ConditionTag'
import { isExperimentMode, type ExperimentMode } from '../configuration/model'

interface ModeOption {
  id: ExperimentMode
  title: string
  summary: string
  risk: string
}

const OPTIONS: ModeOption[] = [
  {
    id: 'paired',
    title: 'Paired Comparison',
    summary: 'Both conditions on equivalent footing, so the only intended difference is whether AegisAI protection is active.',
    risk: 'The strongest evidence for the organisation: it separates what protection changed from what chance or setup did.',
  },
  {
    id: 'baseline',
    title: 'Baseline',
    summary: 'The agent runs without AegisAI protection.',
    risk: 'Shows the unprotected exposure. Use synthetic resources only; on its own it has nothing to compare against.',
  },
  {
    id: 'protected',
    title: 'Protected',
    summary: 'The agent runs with AegisAI protection active.',
    risk: 'Shows how the protected agent behaves, but without a baseline you cannot tell what protection changed.',
  },
]

export function ModeSelector({ value, onChange }: { value: string; onChange: (m: ExperimentMode) => void }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-heading font-semibold text-fg">Experiment mode</legend>
      <div className="grid gap-3 lg:grid-cols-3">
        {OPTIONS.map((o) => {
          const checked = value === o.id
          return (
            <label key={o.id} data-mode={o.id} data-checked={checked} className={cn('rt-mode', `rt-mode-${o.id}`, checked && 'rt-mode-checked')}>
              <input
                type="radio"
                name="experiment-mode"
                value={o.id}
                checked={checked}
                onChange={() => isExperimentMode(o.id) && onChange(o.id)}
                className="sr-only"
              />
              <span className="flex flex-wrap items-center gap-2">
                {o.id === 'paired' ? (
                  <Scale className="size-5 text-fg" aria-hidden />
                ) : (
                  <ConditionTag condition={o.id} short />
                )}
                <span className="text-base font-semibold text-fg">{o.title}</span>
                {o.id === 'paired' && <Badge tone="mint">Recommended</Badge>}
              </span>
              {o.id === 'paired' && (
                <span className="mt-3 flex flex-wrap gap-2" aria-hidden>
                  <ConditionTag condition="baseline" short />
                  <ConditionTag condition="protected" short />
                </span>
              )}
              <span className="mt-3 block text-sm leading-relaxed text-fg-muted">{o.summary}</span>
              <span className="mt-2 block text-sm leading-relaxed text-fg-subtle">{o.risk}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
