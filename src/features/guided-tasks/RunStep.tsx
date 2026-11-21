import { ArrowLeft, ArrowRight, Play } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { RunServiceError, type GuidedTaskOption, type SimulationScenarioOption } from '@/services'
import { CUSTOM, useGuidedStore } from '@/state/guidedStore'
import { useRun, useStartRun } from './hooks'
import { StepHeading } from './StepHeading'
import { buildCustomTask } from './model'

export function RunStep({ task, scenarios }: { task: GuidedTaskOption | undefined; scenarios: SimulationScenarioOption[] }) {
  const { selected, draft, runId, setRunId, setStep } = useGuidedStore()
  const start = useStartRun()
  const existing = useRun(runId)
  const isCustom = selected === CUSTOM
  const template = isCustom ? scenarios.find((s) => s.id === draft.scenarioId)?.template : task?.task

  const title = isCustom ? draft.name.trim() : task?.task.title
  const request = isCustom ? draft.request : task?.task.request

  const begin = () => {
    if (!template) return
    const request = isCustom
      ? { task: buildCustomTask(draft, template), simulationScenarioId: draft.scenarioId }
      : { task: task!.task }
    start.mutate(request, {
      onSuccess: (run) => {
        setRunId(run.id)
        setStep('decisions')
      },
    })
  }

  const error = start.error
  const issues = error instanceof RunServiceError ? error.issues : []

  return (
    <div className="space-y-8">
      <StepHeading title="Run the simulation" description="Starting the run sends this task to the shared run engine. The simulated agent proposes its actions one at a time, and each is evaluated before anything is dispatched." />

      <Card className="space-y-4" data-run-summary>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wider text-fg-subtle">Task</dt><dd className="mt-1 font-semibold text-fg">{title}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-fg-subtle">Path</dt><dd className="mt-1 font-semibold text-fg">Protected (AegisAI evaluation applied)</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-fg-subtle">Request</dt><dd className="mt-1 whitespace-pre-wrap text-fg">{request}</dd></div>
        </dl>
        <p className="text-sm leading-relaxed text-fg-muted">
          This is a <strong>development simulation</strong>. The agent follows a fixed script, the policy rules are demonstration rules, and nothing here is evidence from the AegisAI backend.
        </p>
      </Card>

      {runId && existing.data && !start.isPending && (
        <Card tone="inset" className="flex flex-wrap items-center gap-3 text-sm text-fg-muted" data-existing-run>
          <span className="flex-1">A run for this task already exists ({existing.data.id}). Reopen it, or start a fresh one.</span>
          <Button variant="secondary" onClick={() => setStep(existing.data.status === 'completed' ? 'result' : 'decisions')}>Go to this run</Button>
        </Card>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-peach/50 tint-peach p-4 text-sm text-peach" data-run-error>
          <p className="font-semibold">The simulation could not be started.</p>
          <p className="mt-1">{error.message}</p>
          {issues.length > 0 && <ul className="mt-1 list-disc pl-5">{issues.map((m) => <li key={m}>{m}</li>)}</ul>}
          <p className="mt-1 text-peach/80">No result has been substituted. Nothing ran.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => setStep('review')} leadingIcon={<ArrowLeft className="size-4" aria-hidden />}>Back to the context</Button>
        <Button size="lg" onClick={begin} loading={start.isPending} disabled={!template} leadingIcon={<Play className="size-4" aria-hidden />} trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
          {start.isPending ? 'Starting…' : 'Start simulation'}
        </Button>
      </div>
    </div>
  )
}
