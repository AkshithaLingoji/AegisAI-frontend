import { KeyRound, UserRound } from 'lucide-react'
import { Badge, Card, CardHeader, ExpandableDetails } from '@/components/ui'
import type { AgentWorkspace } from './model'

const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <>
    <dt className="text-fg-subtle">{k}</dt>
    <dd className="break-words text-fg">{children}</dd>
  </>
)

export function IdentitySection({ workspace }: { workspace: AgentWorkspace }) {
  const { agent, principal } = workspace
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card padding="lg" className="space-y-5">
        <CardHeader as="h3" title="The agent" icon={<KeyRound className="size-5" aria-hidden />} iconTone="sky" description={agent.description} />
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-fg-subtle">Environment</dt>
          <dd className="text-fg">{agent.environment ?? 'Not reported'}</dd>
          <dt className="text-fg-subtle">Simulated status</dt>
          <dd className="text-fg">{agent.status ?? 'Not reported'}</dd>
        </dl>
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">What it is built to do</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
              {agent.capabilities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card padding="lg" className="space-y-5">
        <CardHeader
          as="h3"
          title="Who it acts for"
          icon={<UserRound className="size-5" aria-hidden />}
          iconTone="lavender"
          description="Every request comes from a signed-in user. The agent works on that user’s behalf, and what it may reach is tied to that user’s identity record."
        />
        {principal ? (
          <>
            <p className="text-base font-semibold text-fg">{principal.displayName}</p>
            <ul className="flex flex-wrap gap-2" aria-label="Roles">
              {principal.roles.map((r) => (
                <li key={r}>
                  <Badge tone="lavender">{r}</Badge>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-fg-muted">No user identity is recorded for this agent.</p>
        )}
        <ExpandableDetails summary="Technical identity">
          <dl className="grid gap-x-6 gap-y-2 font-mono text-xs sm:grid-cols-[max-content_1fr]">
            <Row k="agent id">{agent.id}</Row>
            <Row k="agent domain">{String(agent.domain)}</Row>
            <Row k="user id">{principal?.id ?? '—'}</Row>
            <Row k="user kind">{principal ? String(principal.kind) : '—'}</Row>
            <Row k="roles">{principal?.roles.join(', ') || '—'}</Row>
            <Row k="scopes">{principal?.scopes.join(', ') || '—'}</Row>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Provisional fields from a development mock. AegisAI’s real identity checks are not implemented in this app.
          </p>
        </ExpandableDetails>
      </Card>
    </div>
  )
}
