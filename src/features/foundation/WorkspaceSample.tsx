import { useEffect, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { DemoWorkspace, type WorkspaceAction } from '@/components/demo/DemoWorkspace'
import { Badge, Card, ExpandableDetails, ScrollRegion, StatePanel } from '@/components/ui'
import { sampleActions, sampleSteps } from './showcaseData'

type RunState = 'idle' | 'running' | 'done'

/**
 * A complete example of the guided workspace pattern the four Red-Team
 * demonstrations will use. Content here is neutral sample text.
 */
export function WorkspaceSample() {
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState<RunState>('idle')

  // Stand-in for a real execution: show a meaningful loading state, then move on.
  useEffect(() => {
    if (run !== 'running') return
    const timer = setTimeout(() => {
      setRun('done')
      setIndex(3)
    }, 1400)
    return () => clearTimeout(timer)
  }, [run])

  const reset = () => {
    setRun('idle')
    setIndex(0)
  }

  const primaryByStep: WorkspaceAction[] = [
    { label: 'Continue', onClick: () => setIndex(1) },
    { label: 'Continue', onClick: () => setIndex(2) },
    {
      label: run === 'running' ? 'Running…' : 'Run sample',
      onClick: () => setRun('running'),
      loading: run === 'running',
      icon: <Play className="size-4" aria-hidden />,
    },
    { label: 'Start over', onClick: reset, icon: <RotateCcw className="size-4" aria-hidden /> },
  ]

  const stage = [
    {
      title: 'The request',
      description: 'This is what the user asked the agent to do, in their own words.',
      body: (
        <blockquote className="rounded-2xl border-l-4 border-lavender bg-raised px-6 py-5 text-lg leading-relaxed text-fg">
          “Summarise the attached sample note in three lines.”
        </blockquote>
      ),
    },
    {
      title: 'What the agent wants to do',
      description: 'Open any action to see the technical detail behind the plain-language description.',
      body: (
        <div className="grid gap-4 md:grid-cols-2">
          {sampleActions.map((action) => (
            <Card key={action.title} tone="inset" className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <p className="font-semibold text-fg">{action.title}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{action.plain}</p>
              </div>
              <div className="mt-auto">
                <ExpandableDetails>
                  <ScrollRegion label={`${action.title}: technical payload`}>
                    <pre className="font-mono text-xs leading-relaxed text-fg-muted">{action.technical}</pre>
                  </ScrollRegion>
                </ExpandableDetails>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      title: 'Run the sample',
      description: 'Press the button below. Loading states always say what is happening.',
      body:
        run === 'running' ? (
          <StatePanel variant="loading" title="Running the sample…" description="The agent is working through its two actions." />
        ) : (
          <StatePanel variant="empty" title="Ready when you are" description="Nothing has run yet." />
        ),
    },
    {
      title: 'Summary',
      description: 'Every workspace ends with a short, plain-language result.',
      body: (
        <StatePanel
          variant="success"
          title="Sample run complete"
          description="Both actions finished. In a real demonstration this is where the outcome and evidence are summarised."
        />
      ),
    },
  ][index]!

  return (
    <DemoWorkspace
      eyebrow="SAMPLE"
      title="Guided workspace pattern"
      titleAs="h3"
      summary="Each demonstration will live in a large, focused workspace like this one: one stage at a time, with clear progress and a single obvious next step."
      instruction={
        index === 2 ? 'Press “Run sample”.' : index === 3 ? 'Press “Start over”, or revisit an earlier step above.' : 'Read the card, then press “Continue”.'
      }
      meta={<Badge tone="peach">Sample content — not an AegisAI demonstration</Badge>}
      steps={sampleSteps}
      currentIndex={index}
      onStepSelect={run === 'running' ? undefined : setIndex}
      stageTitle={stage.title}
      stageDescription={stage.description}
      onBack={index > 0 && run !== 'running' ? () => setIndex(index - 1) : undefined}
      primaryAction={primaryByStep[index]!}
    >
      {stage.body}
    </DemoWorkspace>
  )
}
