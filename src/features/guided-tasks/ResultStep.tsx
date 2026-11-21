import { CircleAlert, CircleCheck, RotateCcw, ShieldX } from 'lucide-react'
import { Badge, Button, Card, DiffView, ExpandableDetails, Timeline, type TimelineItem } from '@/components/ui'
import type { ResourceMetadata, RunRecord } from '@/domain'
import { formatTimestamp } from '@/lib/format'
import { useGuidedStore } from '@/state/guidedStore'
import { StepHeading } from './StepHeading'
import { TrustBadge } from './badges'
import { buildActionViews, changedResources, eventTone, shortDigest, summariseRun } from './model'

export function ResultStep({ run, resources }: { run: RunRecord; resources: ResourceMetadata[] }) {
  const { reset, setStep } = useGuidedStore()
  const summary = summariseRun(run)
  const views = buildActionViews(run, resources)
  const changed = changedResources(run, resources)
  const events = [...run.events].sort((a, b) => a.seq - b.seq)
  const items: TimelineItem[] = events.map((e) => ({
    id: e.id,
    title: e.message,
    meta: `#${e.seq} · ${formatTimestamp(e.at)}`,
    tone: eventTone(e.kind, run, e.proposalId),
    icon: e.kind === 'blocked' || e.kind === 'execution_failed' ? <ShieldX className="size-4" aria-hidden /> : e.kind === 'executed' ? <CircleCheck className="size-4" aria-hidden /> : undefined,
  }))

  if (run.status === 'awaiting_approval') {
    return (
      <div className="space-y-6">
        <StepHeading title="Final result" />
        <p role="status" className="text-peach" data-result-not-ready>This run is still waiting for an approval, so there is no final result yet.</p>
        <Button onClick={() => setStep('decisions')}>Go back to the decisions</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <StepHeading title="Final result" description="What happened, in order, and the evidence recorded for this run." />

      <Card tint={summary.statusTone} className="space-y-3" data-result-status>
        <Badge tone={summary.statusTone} icon={summary.statusTone === 'mint' ? <CircleCheck className="size-3.5" aria-hidden /> : <CircleAlert className="size-3.5" aria-hidden />}>{summary.statusLabel}</Badge>
        <p className="text-base text-fg">{summary.proposed} actions proposed · {summary.ran} ran · {summary.blocked} blocked at the gateway{summary.failed > 0 ? ` · ${summary.failed} failed` : ''}.</p>
        {run.finalReport && <p className="text-sm text-fg-muted" data-final-report>Agent’s report: “{run.finalReport}”</p>}
        <p className="text-xs text-fg-subtle">A run can be “completed” while some actions did not run: the status describes progress, not whether each action succeeded.</p>
      </Card>

      <section aria-labelledby="result-actions" className="space-y-3">
        <h3 id="result-actions" className="text-heading font-semibold text-fg">What happened to each action</h3>
        <ol className="divide-y divide-line rounded-2xl border border-line bg-surface" aria-label="Final outcome per action">
          {views.map((v) => (
            <li key={v.proposalId} className="flex flex-wrap items-center gap-3 px-4 py-3" data-result-action={v.proposalId}>
              <span className="min-w-52 flex-1 text-sm"><span className="font-semibold text-fg">{v.sequence}. {v.summary}</span><br /><span className="text-fg-muted">{v.headline}</span></span>
              <Badge tone={v.tone}>{v.outcome.execution === 'ran' ? 'Ran' : v.outcome.execution === 'failed' ? 'Failed' : 'Did not run'}</Badge>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="result-changes" className="space-y-3">
        <h3 id="result-changes" className="text-heading font-semibold text-fg">Simulated resource changes</h3>
        {changed.length === 0 ? (
          <p className="text-sm text-fg-muted">No observed resource changed state in the simulated sandbox.</p>
        ) : (
          <div className="space-y-4">{changed.map((c) => <DiffView key={c.resourceId} title={c.name} before={c.before} after={c.after} />)}</div>
        )}
      </section>

      <section aria-labelledby="result-timeline" className="space-y-3">
        <h3 id="result-timeline" className="text-heading font-semibold text-fg">Timeline</h3>
        <Timeline items={items} label="Run timeline" />
      </section>

      <section aria-labelledby="result-evidence" className="space-y-3">
        <h3 id="result-evidence" className="text-heading font-semibold text-fg">Evidence recorded</h3>
        <ExpandableDetails summary="Inputs, digests and provenance">
          <div className="space-y-4" data-evidence>
            <p>Produced by the {run.provenance.source === 'mock' ? 'development mock (MOCK / DEVELOPMENT)' : run.provenance.source}. {run.provenance.simulation ? 'The request text was recorded, not interpreted.' : ''} Digests (SHA-256) support deterministic comparison only; they are not signatures and give no tamper evidence.</p>
            <ul className="space-y-2" aria-label="Inputs the agent received">
              {run.inputs.length === 0 && <li>No input documents.</li>}
              {run.inputs.map((i) => (
                <li key={i.inputId} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{i.label}</span><TrustBadge trust={i.trust} />
                  <span className="font-mono text-xs">{i.byteLength.toLocaleString('en-GB')} bytes · {shortDigest(i.contentDigest.hex)}</span>
                </li>
              ))}
            </ul>
            <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
              <div><dt className="text-fg-subtle">Run</dt><dd>{run.id} · revision {run.revision}</dd></div>
              <div><dt className="text-fg-subtle">Initial state</dt><dd>{shortDigest(run.initialState.digest.hex)}</dd></div>
              <div><dt className="text-fg-subtle">Inputs</dt><dd>{shortDigest(run.inputsDigest.hex)}</dd></div>
              {run.provenance.simulation && <div><dt className="text-fg-subtle">Scripted behaviour</dt><dd>{run.provenance.simulation.profileId} · {shortDigest(run.provenance.simulation.profileDigest.hex)}</dd></div>}
              <div><dt className="text-fg-subtle">Started</dt><dd>{formatTimestamp(run.startedAt)}</dd></div>
              {run.completedAt && <div><dt className="text-fg-subtle">Completed</dt><dd>{formatTimestamp(run.completedAt)}</dd></div>}
            </dl>
          </div>
        </ExpandableDetails>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setStep('decisions')}>Back to the decisions</Button>
        <Button onClick={reset} leadingIcon={<RotateCcw className="size-4" aria-hidden />}>Start another task</Button>
      </div>
    </div>
  )
}
