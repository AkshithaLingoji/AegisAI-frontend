import { cn } from '@/lib/cn'
import { Badge } from './Badge'
import { ScrollRegion } from './ScrollRegion'

type RecordLike = Record<string, unknown>

function format(value: unknown): string {
  if (value === undefined) return '—'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export interface DiffRow {
  key: string
  before: string
  after: string
  changed: boolean
}

/** Computes field-level differences. Exported for reuse and testing. */
export function diffRecords(before: RecordLike | null, after: RecordLike | null): DiffRow[] {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])]
  return keys.map((key) => {
    const b = format(before?.[key])
    const a = format(after?.[key])
    return { key, before: b, after: a, changed: b !== a }
  })
}

export interface DiffViewProps {
  title: string
  before: RecordLike | null
  after: RecordLike | null
  beforeLabel?: string
  afterLabel?: string
}

/** Before/after view of a single resource. Changed fields carry a text marker, not just colour. */
export function DiffView({
  title,
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: DiffViewProps) {
  const rows = diffRecords(before, after)
  const changes = rows.filter((r) => r.changed).length

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-raised/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised/60 px-5 py-4">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {changes === 0 ? (
          <Badge tone="mint">No changes</Badge>
        ) : (
          <Badge tone="peach">
            {changes} {changes === 1 ? 'field' : 'fields'} changed
          </Badge>
        )}
      </div>
      <ScrollRegion label={`${title}: before and after`}>
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-fg-subtle">
              <th scope="col" className="px-5 py-3 font-medium">Field</th>
              <th scope="col" className="px-5 py-3 font-medium">{beforeLabel}</th>
              <th scope="col" className="px-5 py-3 font-medium">{afterLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                data-changed={row.changed}
                className={cn('border-t border-line', row.changed && 'bg-peach/[0.08]')}
              >
                <th scope="row" className="px-5 py-3 font-mono text-xs font-medium text-fg-muted">
                  {row.key}
                </th>
                <td className="px-5 py-3 font-mono text-xs text-fg-muted">{row.before}</td>
                <td className="px-5 py-3 font-mono text-xs text-fg">
                  {row.after}
                  {row.changed && <span className="ml-2 text-peach">(changed)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </div>
  )
}
