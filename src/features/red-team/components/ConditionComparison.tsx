import { Equal } from 'lucide-react'
import { ConditionTag } from './ConditionTag'

export interface ComparisonRow {
  aspect: string
  /** Same value for both conditions, as the paired design requires. */
  same: string
}

/**
 * Baseline and Protected side by side. Every row is a thing that must be equivalent
 * across the two conditions; the last row is the single intended difference. This states
 * the design of the experiment: it reports no result and claims nothing about either column.
 */
export function ConditionComparison({ rows }: { rows: ComparisonRow[] }) {
  const conditions = ['baseline', 'protected'] as const
  return (
    <div className="rt-compare" data-comparison="paired">
      <table>
        <caption className="sr-only">What must stay identical between Baseline and Protected, and the one intended difference</caption>
        <thead>
          <tr>
            <th scope="col" className="rt-compare-aspect">Must be equivalent</th>
            {conditions.map((c) => (
              <th key={c} scope="col" className={`rt-compare-head rt-compare-${c}`}>
                <ConditionTag condition={c} short />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.aspect}>
              <th scope="row" className="rt-compare-aspect">{r.aspect}</th>
              <td colSpan={2} className="rt-compare-same">
                <Equal className="size-4 shrink-0" aria-hidden />
                <span>{r.same}</span>
              </td>
            </tr>
          ))}
          <tr className="rt-compare-diff" data-difference>
            <th scope="row" className="rt-compare-aspect">AegisAI protection<span className="rt-compare-note">the intended difference</span></th>
            {conditions.map((c) => (
              <td key={c} className={`rt-compare-${c}`}>
                <strong>{c === 'baseline' ? 'Off' : 'On'}</strong>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
