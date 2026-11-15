import { History, PlayCircle } from 'lucide-react'
import { ConditionBadge } from '@/components/evidence/ConditionBadge'
import { Button, Card, CardHeader, StatePanel } from '@/components/ui'
import { formatTimestamp, plural } from '@/lib/format'
import type { AgentWorkspace, Condition, RunView, TaskView } from './model'

function runSummary(run: RunView): string {
  return `${plural(run.uses.proposed, 'action')} proposed, ${run.uses.executed} ran, ${run.uses.blocked} blocked`
}

function TaskCard({
  task,
  selectedRunId,
  onInspect,
}: {
  task: TaskView
  selectedRunId?: string
  onInspect: (taskId: string, condition: Condition) => void
}) {
  return (
    <Card padding="lg" className="space-y-5" data-task={task.scenario.id}>
      <CardHeader as="h4" eyebrow={task.scenario.id} title={task.scenario.title} description={`Submitted ${formatTimestamp(task.submittedAt)}`} />
      <figure className="rounded-2xl border-l-4 border-lavender bg-raised/60 px-4 py-3">
        <figcaption className="mb-1 text-xs font-medium uppercase tracking-wider text-fg-subtle">Request</figcaption>
        <blockquote className="text-sm leading-relaxed text-fg">“{task.prompt}”</blockquote>
      </figure>
      <ul className="space-y-3" aria-label={`${task.scenario.id} runs`}>
        {task.runs.map((run) => {
          const selected = run.experimentId === selectedRunId
          const label = run.condition === 'protected' ? 'Protected' : 'Baseline'
          return (
            <li key={run.experimentId} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl bg-raised/60 px-4 py-3">
              <ConditionBadge condition={run.condition} />
              <span className="min-w-40 flex-1 text-sm text-fg-muted">{runSummary(run)}.</span>
              <Button
                variant={selected ? 'primary' : 'secondary'}
                aria-pressed={selected}
                aria-label={`Inspect ${label} run of ${task.scenario.id}`}
                onClick={() => onInspect(task.scenario.id, run.condition)}
              >
                {selected ? 'Inspecting' : 'Inspect run'}
              </Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function TasksSection({
  workspace,
  selectedRunId,
  onInspect,
}: {
  workspace: AgentWorkspace
  selectedRunId?: string
  onInspect: (taskId: string, condition: Condition) => void
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="flex items-center gap-2.5 text-heading font-semibold text-fg">
          <PlayCircle className="size-5 text-sky" aria-hidden />
          Current task
        </h3>
        {workspace.currentTasks.length ? (
          workspace.currentTasks.map((t) => (
            <Card key={t.scenario.id} tint="sky" padding="lg">
              <p className="text-sm text-fg">“{t.prompt}”</p>
            </Card>
          ))
        ) : (
          <StatePanel
            variant="empty"
            title="Nothing is running"
            description={`Simulated status: ${workspace.agent.status ?? 'not reported'}. This mock never starts new runs; the tasks below are its recorded history.`}
            className="py-8"
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-2.5 text-heading font-semibold text-fg">
          <History className="size-5 text-lavender" aria-hidden />
          Previous tasks
        </h3>
        {workspace.previousTasks.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {workspace.previousTasks.map((t) => (
              <TaskCard key={t.scenario.id} task={t} selectedRunId={selectedRunId} onInspect={onInspect} />
            ))}
          </div>
        ) : (
          <StatePanel variant="empty" title="No previous tasks" description="No runs are recorded for this agent yet." className="py-8" />
        )}
      </div>
    </div>
  )
}
