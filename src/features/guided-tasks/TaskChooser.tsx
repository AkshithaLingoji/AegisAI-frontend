import { ArrowRight, FileText, HeartPulse, PenLine, Wallet, History } from 'lucide-react'
import { Badge, Button, Card, CardHeader, StatePanel } from '@/components/ui'
import type { RunRecord } from '@/domain'
import type { GuidedTaskOption } from '@/services'
import { CUSTOM, useGuidedStore } from '@/state/guidedStore'
import { formatTimestamp } from '@/lib/format'
import { StepHeading } from './StepHeading'
import { summariseRun } from './model'

const DOMAIN_ICON = { finance: Wallet, health: HeartPulse } as const

export function TaskChooser({ tasks, customAvailable, sessionRuns }: { tasks: GuidedTaskOption[]; customAvailable: boolean; sessionRuns: RunRecord[] }) {
  const select = useGuidedStore((s) => s.select)
  const openRun = useGuidedStore((s) => s.openRun)

  if (tasks.length === 0) {
    return <StatePanel variant="empty" title="No guided tasks are available" description="The selected source returned an empty task catalogue." />
  }

  return (
    <div className="space-y-8">
      <StepHeading
        title="Choose a task"
        description="Pick a scenario to watch an AI agent propose actions, and see how AegisAI evaluates each one before anything runs."
      />
      <ul className="grid gap-5 lg:grid-cols-2" aria-label="Guided tasks">
        {tasks.map(({ task, objective, includesApproval }) => {
          const Icon = DOMAIN_ICON[String(task.domain) as keyof typeof DOMAIN_ICON] ?? FileText
          const adversarial = task.inputs.some((i) => i.trust.level === 'untrusted')
          return (
            <li key={task.id}>
              <Card tint={adversarial ? 'rose' : 'lavender'} className="flex h-full flex-col gap-5" data-task-card={task.id}>
                <CardHeader
                  as="h3"
                  eyebrow={task.id}
                  title={task.title}
                  icon={<Icon className="size-6" aria-hidden />}
                  iconTone={adversarial ? 'rose' : 'lavender'}
                  description={task.summary}
                />
                <p className="text-sm leading-relaxed text-fg-muted">
                  <strong className="font-semibold text-fg">What it demonstrates: </strong>
                  {objective}
                </p>
                <div className="flex flex-wrap gap-2">
                  {adversarial && <Badge tone="rose">Contains an untrusted instruction</Badge>}
                  {includesApproval && <Badge tone="peach">Includes a simulated approval</Badge>}
                </div>
                <div className="mt-auto">
                  <Button onClick={() => select(task.id)} aria-label={`Choose ${task.title} (${task.id})`} trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
                    Choose this task
                  </Button>
                </div>
              </Card>
            </li>
          )
        })}
        <li>
          <Card tint="sky" className="flex h-full flex-col gap-5" data-task-card="custom">
            <CardHeader
              as="h3"
              eyebrow="Custom"
              title="Custom task"
              icon={<PenLine className="size-6" aria-hidden />}
              iconTone="sky"
              description="Write your own request and supply your own input text. A supported script decides what the simulated agent does; your request is recorded, not interpreted."
            />
            {!customAvailable && (
              <p className="text-sm text-peach">Custom tasks need the development simulation, which is not available from the selected source.</p>
            )}
            <div className="mt-auto">
              <Button variant="secondary" disabled={!customAvailable} onClick={() => select(CUSTOM)} trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
                Create a custom task
              </Button>
            </div>
          </Card>
        </li>
      </ul>

      <section aria-labelledby="session-runs" className="space-y-3">
        <h3 id="session-runs" className="flex items-center gap-2 text-heading font-semibold text-fg">
          <History className="size-5 text-fg-subtle" aria-hidden /> Runs in this session
        </h3>
        {sessionRuns.length === 0 ? (
          <p className="text-sm text-fg-muted">No runs yet. History is kept in memory for this session only and is lost when the page reloads.</p>
        ) : (
          <>
            <p className="text-sm text-fg-muted">Kept in memory for this session only. These runs are separate from the Command Center’s seeded figures.</p>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {sessionRuns.map((run) => (
                <li key={run.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold text-fg">{run.task.title}</p>
                    <p className="text-xs text-fg-subtle">
                      {run.id} · {formatTimestamp(run.startedAt)} · {summariseRun(run).statusLabel}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => openRun({ id: run.id, status: run.status, taskDefinitionId: run.taskDefinitionId, origin: run.task.origin })} aria-label={`Reopen run ${run.id}`}>
                    Reopen
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
