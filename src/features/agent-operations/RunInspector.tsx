import { forwardRef } from 'react'
import { FileText, Inbox, Lightbulb, Pencil, Scale, ShieldX, CircleCheck } from 'lucide-react'
import { ConditionBadge } from '@/components/evidence/ConditionBadge'
import { Badge, Button, Card, CardHeader, ExpandableDetails, StatePanel, Timeline, type Tone, type TimelineItem } from '@/components/ui'
import { formatTimestamp, plural } from '@/lib/format'
import { DecisionBadge, OutcomeBadge, ScopeBadge } from './badges'
import type { ExecutionEvent } from '@/domain'
import type { Condition, ProposalView, RunView, TaskView } from './model'

const time = (iso: string) => (iso.length >= 19 ? iso.slice(11, 19) : iso)

function eventStyle(kind: string, outcome?: string): { tone: Tone; icon: React.ReactNode } {
  const cls = 'size-4'
  switch (kind) {
    case 'task_received': return { tone: 'lavender', icon: <Inbox className={cls} aria-hidden /> }
    case 'action_proposed': return { tone: 'sky', icon: <Lightbulb className={cls} aria-hidden /> }
    case 'policy_evaluated': return { tone: 'sky', icon: <Scale className={cls} aria-hidden /> }
    case 'gateway_result':
      return outcome === 'blocked'
        ? { tone: 'red', icon: <ShieldX className={cls} aria-hidden /> }
        : { tone: 'mint', icon: <CircleCheck className={cls} aria-hidden /> }
    case 'resource_changed': return { tone: 'peach', icon: <Pencil className={cls} aria-hidden /> }
    case 'report_generated': return { tone: 'lavender', icon: <FileText className={cls} aria-hidden /> }
    default: return { tone: 'neutral', icon: undefined }
  }
}

function ProposalCard({ view }: { view: ProposalView }) {
  const { proposal, evaluation, gateway } = view
  return (
    <li>
      <Card tone="inset" className={view.outcome === 'blocked' ? 'space-y-4 border-red/55 border-l-4 border-l-red-deep' : 'space-y-4'} data-proposal={proposal.id} data-outcome={view.outcome}>
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-xs text-fg-muted" aria-hidden>
            {proposal.sequence}
          </span>
          <div className="min-w-48 flex-1">
            <p className="text-base font-semibold text-fg">
              <span className="sr-only">Action {proposal.sequence}: </span>
              {proposal.summary}
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">Aimed at: {view.resourceName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScopeBadge outOfScope={view.outOfScope} />
          <DecisionBadge decision={evaluation ? String(evaluation.decision) : undefined} />
          <OutcomeBadge outcome={view.outcome} outOfScope={view.outOfScope} />
        </div>
        <ExpandableDetails summary="Inspect this action">
          <div className="space-y-4">
            {proposal.rationale && (
              <p>
                <span className="font-medium text-fg">Why the agent proposed it: </span>
                {proposal.rationale}
              </p>
            )}
            {evaluation ? (
              <div className="space-y-1.5">
                <p className="font-medium text-fg">Demonstration rules said {String(evaluation.decision)}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {evaluation.reasons.map((r) => (
                    <li key={r.code}>
                      {r.message} <span className="font-mono text-xs text-fg-subtle">({r.code})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No policy check was made: this run had no assurance layer.</p>
            )}
            {gateway?.message && (
              <p>
                <span className="font-medium text-fg">What happened: </span>
                {gateway.message}
              </p>
            )}
            <dl className="grid gap-x-6 gap-y-1.5 font-mono text-xs sm:grid-cols-[max-content_1fr]">
              <dt className="text-fg-subtle">kind</dt>
              <dd className="text-fg">{String(proposal.kind)}</dd>
              <dt className="text-fg-subtle">tool</dt>
              <dd className="text-fg">{view.toolName ?? 'no matching tool'}</dd>
              <dt className="text-fg-subtle">target</dt>
              <dd className="break-all text-fg">{proposal.targetResourceId}</dd>
              <dt className="text-fg-subtle">parameters</dt>
              <dd className="break-all text-fg">{JSON.stringify(proposal.parameters)}</dd>
              <dt className="text-fg-subtle">record ids</dt>
              <dd className="break-all text-fg">
                {[proposal.id, evaluation?.id, gateway?.id].filter(Boolean).join(' · ')}
              </dd>
            </dl>
          </div>
        </ExpandableDetails>
      </Card>
    </li>
  )
}

function timelineItems(run: RunView): TimelineItem[] {
  const outcomeByProposal = new Map(run.proposals.map((p) => [p.proposal.id, p.outcome]))
  return run.events.map((e: ExecutionEvent) => {
    const outcome = e.refs?.proposalId ? outcomeByProposal.get(e.refs.proposalId) : undefined
    const { tone, icon } = eventStyle(String(e.kind), outcome)
    const retrieved = e.payload?.retrievedContent
    return {
      id: e.id,
      tone,
      icon,
      title: e.summary,
      meta: time(e.timestamp),
      description: retrieved ? `The agent read: “${String(retrieved)}”` : undefined,
    }
  })
}

export interface RunInspectorProps {
  task?: TaskView
  run?: RunView
  condition: Condition
  onSelectCondition: (condition: Condition) => void
}

/** Proposed actions and execution history of one run. Focusable so "Inspect run" can move here. */
export const RunInspector = forwardRef<HTMLDivElement, RunInspectorProps>(function RunInspector(
  { task, run, condition, onSelectCondition },
  ref,
) {
  if (!task || !run) {
    return (
      <StatePanel
        variant="empty"
        title="No run to inspect"
        description="This agent has no recorded runs, so there are no proposed actions or execution history yet."
      />
    )
  }
  const conditions: Condition[] = ['baseline', 'protected']
  const available = new Set(task.runs.map((r) => r.condition))

  return (
    <div ref={ref} tabIndex={-1} aria-label="Selected run" data-run-inspector={run.experimentId} className="space-y-6 outline-none">
      <Card tint={condition === 'protected' ? 'sky' : undefined} padding="lg" className="space-y-5">
        <CardHeader
          as="h3"
          eyebrow={task.scenario.id}
          title={task.scenario.title}
          description={`“${task.prompt}”`}
          action={<ConditionBadge condition={condition} />}
        />
        <div role="group" aria-label="Condition to inspect" className="flex flex-wrap gap-3">
          {conditions.map((c) => (
            <Button
              key={c}
              variant={c === condition ? 'primary' : 'secondary'}
              aria-pressed={c === condition}
              disabled={!available.has(c)}
              onClick={() => onSelectCondition(c)}
            >
              {c === 'protected' ? 'Protected run' : 'Baseline run'}
            </Button>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">
          {plural(run.uses.proposed, 'action')} proposed: {run.uses.executed} ran, {run.uses.blocked} blocked.
          {run.outOfScopeExecuted > 0 && ` ${plural(run.outOfScopeExecuted, 'out-of-scope action')} ran.`}
          {run.outOfScopeBlocked > 0 && ` ${plural(run.outOfScopeBlocked, 'out-of-scope action')} blocked before running.`}{' '}
          {condition === 'baseline'
            ? 'This run had no assurance layer, so nothing was checked.'
            : 'Checks in this run come from demonstration rules, not a real policy engine.'}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
          <Badge tone="peach">Simulated</Badge>
          Ran {formatTimestamp(run.startedAt)}
        </p>
      </Card>

      <div className="space-y-4">
        <h3 className="text-heading font-semibold text-fg">Proposed actions</h3>
        <ol aria-label="Proposed actions" className="space-y-4">
          {run.proposals.map((p) => (
            <ProposalCard key={p.proposal.id} view={p} />
          ))}
        </ol>
      </div>

      <ExpandableDetails summary={`Execution timeline (${plural(run.events.length, 'step')})`}>
        <Timeline items={timelineItems(run)} label="Execution timeline" />
        {run.finalReport && <p className="mt-4 text-sm text-fg">{run.finalReport}</p>}
      </ExpandableDetails>
    </div>
  )
})
