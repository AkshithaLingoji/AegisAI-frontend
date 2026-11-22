import { CircleAlert, Database, FlaskConical, PlugZap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Card, StatePanel } from '@/components/ui'
import type { BackendConnectionStatus } from '@/domain'
import { useRedTeamExecutions, useRedTeamScenarios, useRedTeamStatus } from '../hooks'

/** Pure presentation of a status. `CONNECTED BACKEND` appears only for a `connected` status. */
export function ConnectionBadge({ status }: { status: BackendConnectionStatus }) {
  switch (status.state) {
    case 'connected':
      return <Badge tone="mint" icon={<Database className="size-3.5" aria-hidden />}>CONNECTED BACKEND</Badge>
    case 'mock':
      return <Badge tone="peach" icon={<FlaskConical className="size-3.5" aria-hidden />}>MOCK / DEVELOPMENT</Badge>
    case 'unreachable':
      return <Badge tone="peach" icon={<CircleAlert className="size-3.5" aria-hidden />}>BACKEND UNREACHABLE</Badge>
    default:
      return <Badge tone="peach" icon={<PlugZap className="size-3.5" aria-hidden />}>BACKEND NOT CONNECTED</Badge>
  }
}

function Row({ label, children, ...rest }: { label: string; children: ReactNode; 'data-row': string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4" {...rest}>
      <dt className="text-sm font-medium text-fg">{label}</dt>
      <dd className="text-sm leading-relaxed text-fg-muted">{children}</dd>
    </div>
  )
}

export function ConnectionPanel() {
  const status = useRedTeamStatus()
  const scenarios = useRedTeamScenarios()
  const executions = useRedTeamExecutions()

  if (status.isPending) return <StatePanel variant="loading" title="Checking the Red-Team subsystem…" className="py-10" />
  if (status.isError) {
    return <StatePanel variant="error" title="The connection status couldn't be read" description={status.error.message} className="py-10" />
  }
  const s = status.data
  const isMock = s.state === 'mock'

  return (
    <Card className="space-y-2" data-connection-state={s.state}>
      <div className="flex flex-wrap items-center gap-3">
        <ConnectionBadge status={s} />
        <p className="min-w-60 flex-1 text-sm leading-relaxed text-fg-muted" data-connection-detail>{s.detail}</p>
      </div>
      <dl className="divide-y divide-line">
        <Row label="Scenario library" data-row="scenarios">
          {scenarios.isPending && 'Loading…'}
          {scenarios.isError && <>Unavailable. {scenarios.error.message}</>}
          {scenarios.isSuccess &&
            (scenarios.data.length === 0
              ? 'The source returned no scenarios.'
              : isMock
                ? `${scenarios.data.length} illustrative demonstration entries are loaded so the interface can be shown. They are not the Red-Team library.`
                : `${scenarios.data.length} scenarios reported by the source.`)}
        </Row>
        <Row label="Execution history" data-row="executions">
          {executions.isPending && 'Loading…'}
          {executions.isError && <>Unavailable. {executions.error.message}</>}
          {executions.isSuccess &&
            (executions.data.length === 0 ? 'No executions yet. Nothing has been run, so there are no results to show.' : `${executions.data.length} executions recorded. Browsing them arrives in a later patch.`)}
        </Row>
      </dl>
    </Card>
  )
}
