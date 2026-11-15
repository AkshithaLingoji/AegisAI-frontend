import { Ban, CircleCheck } from 'lucide-react'
import { Badge, Card, CardHeader, ExpandableDetails } from '@/components/ui'
import { plural } from '@/lib/format'
import type { AgentWorkspace } from './model'

const SCOPE_WORDS: Record<string, string> = {
  read: 'Look at records',
  write: 'Save or change records',
  export: 'Send data outside the organisation',
  transact: 'Make transactions',
}
const words = (scope: string) => SCOPE_WORDS[scope] ?? scope

/** Restates what the identity record lists. It does not decide or enforce anything. */
export function PermissionsSection({ workspace }: { workspace: AgentWorkspace }) {
  const { principal, tools } = workspace
  const listed = principal?.scopes ?? []
  const notListed = [...new Set(tools.filter((t) => t.grant === 'not-listed').map((t) => t.tool.requiredScope!))]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card tint="mint" padding="lg" className="space-y-4" data-permissions="listed">
        <CardHeader as="h3" title="What the user is permitted to do" icon={<CircleCheck className="size-5" aria-hidden />} iconTone="mint" />
        {listed.length ? (
          <ul className="space-y-2">
            {listed.map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-sm text-fg">
                <CircleCheck className="size-4 shrink-0 text-mint" aria-hidden />
                {words(s)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">The identity record lists no permitted actions.</p>
        )}
        <p className="text-sm text-fg-muted">
          {plural(workspace.permittedResources.length, 'resource')} listed as permitted
          {workspace.restrictedResources.length > 0 && <>, {workspace.restrictedResources.length} restricted</>}.
        </p>
      </Card>

      <Card tint="red" padding="lg" className="space-y-4" data-permissions="not-listed">
        <CardHeader as="h3" title="What is not on the user’s list" icon={<Ban className="size-5" aria-hidden />} iconTone="red" />
        {notListed.length ? (
          <ul className="space-y-2">
            {notListed.map((s) => (
              <li key={s} className="flex items-center gap-2.5 text-sm text-fg">
                <Ban className="size-4 shrink-0 text-red" aria-hidden />
                {words(s)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Every tool’s required permission is on the user’s list.</p>
        )}
        <p className="text-sm text-fg-muted">
          The agent has tools that could do these things, but the user’s identity record does not include them.
        </p>
      </Card>

      <div className="lg:col-span-2">
        <ExpandableDetails summary="Raw permission data">
          <dl className="grid gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-[max-content_1fr]">
            <dt className="text-fg-subtle">scopes</dt>
            <dd className="text-fg">{listed.join(', ') || '—'}</dd>
            <dt className="text-fg-subtle">permittedResourceIds</dt>
            <dd className="break-words text-fg">{principal?.permittedResourceIds?.join(', ') ?? 'not reported'}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {notListed.map((s) => (
              <Badge key={s} tone="red">{`${s}: not listed`}</Badge>
            ))}
          </div>
        </ExpandableDetails>
      </div>
    </div>
  )
}
