import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Stepper, StatePanel } from '@/components/ui'
import { GUIDED_STEPS, useGuidedStore } from '@/state/guidedStore'
import { ContextStep } from './ContextStep'
import { DecisionsStep } from './DecisionsStep'
import { ResultStep } from './ResultStep'
import { RunStep } from './RunStep'
import { TaskChooser } from './TaskChooser'
import { useGuidedCatalogue, useRun, useSessionRuns, useSimulationScenarios } from './hooks'

export function GuidedTasksPage() {
  const catalogue = useGuidedCatalogue()
  const scenarios = useSimulationScenarios()
  const sessionRuns = useSessionRuns()
  const { step, selected, runId, setStep } = useGuidedStore()
  const run = useRun(runId)

  const stepIndex = GUIDED_STEPS.findIndex((s) => s.id === step)
  const data = catalogue.data
  const task = data?.tasks.find((t) => t.task.id === selected)

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Guided Tasks"
        title="Guided Tasks"
        description="Walk through one task from request to result: what an AI agent proposes, how AegisAI evaluates each action, and what actually happened. Everything here is simulated."
      />

      {catalogue.isPending && <StatePanel variant="loading" title="Loading the guided tasks…" description="Fetching the task catalogue and resources." className="py-20" />}

      {catalogue.isError && (
        <StatePanel
          variant="error"
          title="The guided tasks couldn't be loaded"
          description={<>{catalogue.error.message} The app does not substitute mock data when the selected source is unavailable.</>}
          action={<Button variant="secondary" onClick={() => catalogue.refetch()} leadingIcon={<RefreshCw className="size-4" aria-hidden />}>Try again</Button>}
          className="py-16"
        />
      )}

      {data && (
        <>
          <Stepper steps={GUIDED_STEPS} currentIndex={stepIndex} onStepSelect={(i) => setStep(GUIDED_STEPS[i]!.id)} />

          {step === 'choose' && <TaskChooser tasks={data.tasks} customAvailable={scenarios.isSuccess && scenarios.data.length > 0} sessionRuns={sessionRuns.data ?? []} />}

          {step === 'review' && <ContextStep task={task} scenarios={scenarios.data ?? []} resources={data.resources} agents={data.agents} principals={data.principals} />}

          {step === 'run' && <RunStep task={task} scenarios={scenarios.data ?? []} />}

          {(step === 'decisions' || step === 'result') && !runId && (
            <StatePanel variant="empty" title="No run to show yet" description="Start a simulation first." action={<Button onClick={() => setStep(selected ? 'run' : 'choose')}>{selected ? 'Go to the simulation' : 'Choose a task'}</Button>} />
          )}
          {(step === 'decisions' || step === 'result') && runId && run.isPending && <StatePanel variant="loading" title="Loading the run…" className="py-16" />}
          {(step === 'decisions' || step === 'result') && runId && run.isError && (
            <StatePanel variant="error" title="The run couldn't be loaded" description={run.error.message} action={<Button variant="secondary" onClick={() => run.refetch()}>Try again</Button>} />
          )}
          {step === 'decisions' && run.data && <DecisionsStep run={run.data} resources={data.resources} />}
          {step === 'result' && run.data && <ResultStep run={run.data} resources={data.resources} />}
        </>
      )}
    </div>
  )
}
