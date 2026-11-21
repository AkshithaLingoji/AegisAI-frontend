import { Check, Hourglass, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card } from '@/components/ui'
import { toneTint } from '@/components/ui/tones'
import type { ResourceMetadata, RunRecord } from '@/domain'
import { cn } from '@/lib/cn'
import { RunServiceError } from '@/services'
import { useGuidedStore } from '@/state/guidedStore'
import { useResolveApproval } from './hooks'
import { StepHeading } from './StepHeading'
import { DecisionBadge } from './badges'
import { buildActionViews, summariseRun, type ActionView } from './model'

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  )
}

function ApprovalControls({ run, view }: { run: RunRecord; view: ActionView }) {
  const resolve = useResolveApproval()
  const [note, setNote] = useState('')
  const error = resolve.error
  const decide = (outcome: 'approved' | 'rejected') =>
    resolve.mutate({ runId: run.id, requestId: view.pendingRequestId!, outcome, ...(note.trim() ? { note: note.trim() } : {}) })
  return (
    <div className="space-y-3 rounded-2xl border border-peach/50 tint-peach p-4" data-approval-controls>
      <p className="flex items-center gap-2 text-sm font-semibold text-peach"><Hourglass className="size-4" aria-hidden /> This action is waiting for a simulated human approval</p>
      <p className="text-sm leading-relaxed text-fg-muted">
        If you <strong>approve</strong>, the gateway dispatches this action and it runs, then the simulated agent continues. If you <strong>reject</strong>, it is blocked and does not run, and the agent still continues with its remaining steps. Later actions are not proposed until you decide.
      </p>
      <div className="space-y-1.5">
        <label htmlFor={`note-${view.proposalId}`} className="text-xs font-medium text-fg-muted">Optional note (recorded with your decision)</label>
        <input id={`note-${view.proposalId}`} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-line-strong bg-raised px-4 py-2.5 text-sm text-fg" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => decide('approved')} loading={resolve.isPending} leadingIcon={<Check className="size-4" aria-hidden />} aria-label={`Approve: ${view.summary}`}>Approve (simulated)</Button>
        <Button variant="danger" onClick={() => decide('rejected')} disabled={resolve.isPending} leadingIcon={<X className="size-4" aria-hidden />} aria-label={`Reject: ${view.summary}`}>Reject (simulated)</Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-pale" data-approval-error>
          {error instanceof RunServiceError && error.code === 'already-resolved' ? 'This approval has already been resolved.' : error.message}
        </p>
      )}
    </div>
  )
}

function ActionCard({ run, view }: { run: RunRecord; view: ActionView }) {
  return (
    <li>
      <article
        data-action={view.proposalId}
        data-tone={view.tone}
        aria-label={`Action ${view.sequence}: ${view.summary}`}
        className={cn('space-y-4 rounded-card border p-5 shadow-card sm:p-6', toneTint[view.tone])}
      >
        <header className="flex flex-wrap items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-raised text-sm font-semibold text-fg" aria-hidden>{view.sequence}</span>
          <h3 className="min-w-48 flex-1 text-heading font-semibold text-fg">{view.summary}</h3>
          <DecisionBadge decisionKey={view.decisionKey} raw={view.decisionRaw} />
        </header>
        <p className="text-sm font-medium text-fg" data-headline>{view.headline}</p>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label="Proposed by the agent">
            <span className="capitalize">{view.kind}</span> · {view.resourceName}
            {view.sensitivity && <span className="ml-2 inline-block"><Badge tone={view.sensitivity === 'restricted' ? 'rose' : 'neutral'}>{view.sensitivity}</Badge></span>}
          </Fact>
          <Fact label="Gateway">{view.outcome.gateway === null ? 'Nothing dispatched or blocked yet' : view.outcome.gateway === 'blocked' ? 'Blocked' : view.outcome.gateway === 'dispatched' ? 'Dispatched' : view.outcome.gateway}</Fact>
          <Fact label="Execution">{view.outcome.execution === null ? 'Not recorded' : view.outcome.execution === 'ran' ? 'Ran' : view.outcome.execution === 'not_run' ? 'Did not run' : 'Failed'}</Fact>
        </dl>
        {view.rationale && <p className="text-sm text-fg-muted"><strong className="font-medium text-fg">Why the agent proposed it: </strong>{view.rationale}</p>}
        {view.reasons.length > 0 && (
          <div className="space-y-1 text-sm">
            <p className="font-medium text-fg">Why this evaluation (simulated demonstration rules)</p>
            <ul className="list-disc space-y-0.5 pl-5 text-fg-muted">
              {view.reasons.map((r) => <li key={r.code}><span className="font-mono text-xs text-fg-subtle">{r.code}</span> — {r.message}</li>)}
            </ul>
          </div>
        )}
        {view.approvalNote && <p className="text-sm text-fg-muted">Your note: “{view.approvalNote}”</p>}
        {view.pendingRequestId && <ApprovalControls run={run} view={view} />}
      </article>
    </li>
  )
}

export function DecisionsStep({ run, resources }: { run: RunRecord; resources: ResourceMetadata[] }) {
  const setStep = useGuidedStore((s) => s.setStep)
  const views = buildActionViews(run, resources)
  const summary = summariseRun(run)
  return (
    <div className="space-y-8">
      <StepHeading
        title="Inspect the decisions"
        description="Here is every action the agent has proposed so far, in order. For each one, the evaluation, the gateway and the execution are separate facts."
      />
      <div role="note" className="rounded-2xl border border-lavender/30 bg-lavender/[0.1] p-4 text-sm leading-relaxed text-fg-muted">
        <strong className="text-fg">Evaluation is not enforcement.</strong> A decision such as ALLOW or DENY is a simulated policy evaluation using demonstration rules. Whether an action was dispatched and whether it actually ran are recorded separately. None of this is real backend enforcement.
      </div>

      <Card className="flex flex-wrap items-center gap-4" data-run-status={run.status}>
        <Badge tone={summary.statusTone}>{summary.statusLabel}</Badge>
        <p className="text-sm text-fg-muted">
          {summary.proposed} proposed · {summary.ran} ran · {summary.blocked} blocked{summary.pendingApprovals > 0 ? ` · ${summary.pendingApprovals} waiting for approval` : ''}
        </p>
        <p className="text-xs text-fg-subtle sm:ml-auto">Run {run.id} · revision {run.revision}</p>
      </Card>

      {run.status === 'awaiting_approval' && (
        <p role="status" className="text-sm text-peach" data-paused-note>
          The agent is paused. Actions after the one waiting for approval have not been proposed, evaluated or dispatched yet.
        </p>
      )}

      <ol className="space-y-5" aria-label="Actions in the order the agent proposed them">
        {views.map((v) => <ActionCard key={v.proposalId} run={run} view={v} />)}
      </ol>

      {run.status === 'completed' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => setStep('result')}>See the final result</Button>
          <p className="text-sm text-fg-muted">The run is complete. The result page shows the timeline and the evidence recorded.</p>
        </div>
      )}
    </div>
  )
}
