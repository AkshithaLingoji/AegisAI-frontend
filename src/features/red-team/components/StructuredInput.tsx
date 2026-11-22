import type { JsonValue } from '@/domain'

const isPrimitive = (v: JsonValue): v is string | number | boolean | null => v === null || typeof v !== 'object'

/** Shows a JSON value exactly as supplied, as text. Never interpreted or executed. */
export function JsonBlock({ value }: { value: JsonValue }) {
  return <pre className="rt-pre">{JSON.stringify(value, null, 2)}</pre>
}

/** Field list for structured input or details; nested values are shown as formatted JSON. */
export function FieldList({ fields, label }: { fields: Record<string, JsonValue>; label: string }) {
  const entries = Object.entries(fields)
  if (entries.length === 0) return <p className="text-sm text-fg-muted">No fields.</p>
  return (
    <dl aria-label={label} className="divide-y divide-line">
      {entries.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4" data-field={k}>
          <dt className="font-mono text-xs text-fg-subtle sm:pt-0.5">{k}</dt>
          <dd className="min-w-0 text-sm text-fg">{isPrimitive(v) ? <span className="whitespace-pre-wrap">{v === null ? 'null' : String(v)}</span> : <JsonBlock value={v} />}</dd>
        </div>
      ))}
    </dl>
  )
}
