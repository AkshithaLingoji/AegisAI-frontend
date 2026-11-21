import { ArrowLeft, ArrowRight, Bot, FileLock2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, ExpandableDetails, ScrollRegion } from '@/components/ui'
import type { AuthenticatedPrincipal, Agent, ResourceMetadata, TaskDefinition } from '@/domain'
import type { GuidedTaskOption, SimulationScenarioOption } from '@/services'
import { CUSTOM, useGuidedStore } from '@/state/guidedStore'
import { CustomTaskForm } from './CustomTaskForm'
import { StepHeading } from './StepHeading'
import { TrustBadge } from './badges'
import { validateDraft } from './model'

interface Props {
  task: GuidedTaskOption | undefined
  scenarios: SimulationScenarioOption[]
  resources: ResourceMetadata[]
  agents: Agent[]
  principals: AuthenticatedPrincipal[]
}

function ResourceList({ task, resources, principal }: { task: TaskDefinition; resources: ResourceMetadata[]; principal?: AuthenticatedPrincipal }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-raised/50" aria-label="Resources in scope">
      {task.selectedResourceIds.map((id) => {
        const r = resources.find((x) => x.id === id)
        const permitted = principal?.permittedResourceIds?.includes(id)
        return (
          <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <FileLock2 className="size-4 text-fg-subtle" aria-hidden />
            <span className="min-w-40 flex-1 font-medium text-fg">{r?.name ?? id}</span>
            {r?.sensitivity && <Badge tone={String(r.sensitivity) === 'restricted' ? 'rose' : 'neutral'}>{String(r.sensitivity)}</Badge>}
            <Badge tone={permitted ? 'mint' : 'peach'}>{permitted ? 'In the identity’s permitted list' : 'Not in the identity’s permitted list'}</Badge>
          </li>
        )
      })}
    </ul>
  )
}

export function ContextStep({ task, scenarios, resources, agents, principals }: Props) {
  const { selected, draft, setStep, reset } = useGuidedStore()
  const isCustom = selected === CUSTOM
  const template = isCustom ? scenarios.find((s) => s.id === draft.scenarioId)?.template : task?.task
  const validation = validateDraft(draft, template)
  const [showErrors, setShowErrors] = useState(false)

  const shown: TaskDefinition | undefined = isCustom ? template : task?.task
  const agent = agents.find((a) => a.id === shown?.agentId)
  const principal = principals.find((p) => p.id === shown?.actingPrincipalId)

  return (
    <div className="space-y-8">
      <StepHeading
        title={isCustom ? 'Describe your task' : 'Review the task and its context'}
        description={isCustom ? 'Tell the simulation what to record and which scripted behaviour to follow. Review it before you start.' : 'This is exactly what the simulated agent will be given. Nothing runs until you start the simulation.'}
      />

      {!isCustom && task && (
        <Card className="space-y-4" data-context="request">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{task.task.id} · {task.task.title}</p>
            <p className="text-sm text-fg-muted">{task.task.summary}</p>
          </div>
          <figure className="rounded-2xl border border-lavender/30 bg-lavender/[0.1] p-4">
            <figcaption className="mb-1 text-xs font-medium uppercase tracking-wider text-lavender">The request (verbatim)</figcaption>
            <blockquote className="text-base leading-relaxed text-fg">{task.task.request}</blockquote>
          </figure>
        </Card>
      )}

      {isCustom && <CustomTaskForm scenarios={scenarios} validation={validation} showErrors={showErrors} />}

      {shown && (
        <Card className="space-y-5" data-context="who-and-what">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 size-5 text-sky" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wider text-fg-subtle">Agent</p>
                <p className="text-sm font-semibold text-fg">{agent?.name ?? shown.agentId}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserRound className="mt-0.5 size-5 text-lavender" aria-hidden />
              <div>
                <p className="text-xs uppercase tracking-wider text-fg-subtle">Simulated acting identity</p>
                <p className="text-sm font-semibold text-fg">{principal?.displayName ?? shown.actingPrincipalId}</p>
                <p className="text-xs text-fg-subtle">Simulated. There is no authentication.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Resources in scope</h3>
            <ResourceList task={shown} resources={resources} principal={principal} />
          </div>
        </Card>
      )}

      {!isCustom && task && (
        <Card className="space-y-4" data-context="inputs">
          <div className="space-y-1">
            <h3 className="text-heading font-semibold text-fg">Documents the agent retrieves</h3>
            <p className="text-sm leading-relaxed text-fg-muted">Trust is assigned by the built-in catalogue data, not by the content itself. “Declared trusted” only means the demonstration data declares it so; it is not a verdict that the content is safe.</p>
          </div>
          {task.task.inputs.length === 0 && <p className="text-sm text-fg-subtle">This task has no input documents.</p>}
          {task.task.inputs.map((input) => (
            <div key={input.id} className="space-y-2" data-input={input.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-fg">{input.label}</p>
                <TrustBadge trust={input.trust} />
              </div>
              <p className="text-xs text-fg-subtle">{input.trust.reason}</p>
              <ExpandableDetails summary="Show the document text" defaultOpen={input.trust.level === 'untrusted'}>
                <ScrollRegion label={input.label}>
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">{input.content}</pre>
                </ScrollRegion>
              </ExpandableDetails>
            </div>
          ))}
        </Card>
      )}

      {isCustom && draft.scenarioId && scenarios.find((s) => s.id === draft.scenarioId) && (
        <Card tone="inset" data-context="custom-summary" className="text-sm text-fg-muted">
          <p><strong className="text-fg">Review:</strong> “{draft.name.trim() || 'Untitled'}” with {draft.inputs.length} input{draft.inputs.length === 1 ? '' : 's'}, all untrusted by default, following the {draft.scenarioId} script.</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={reset} leadingIcon={<ArrowLeft className="size-4" aria-hidden />}>Choose a different task</Button>
        <Button
          onClick={() => {
            if (isCustom && !validation.valid) return setShowErrors(true)
            setStep('run')
          }}
          disabled={!isCustom && !task}
          trailingIcon={<ArrowRight className="size-4" aria-hidden />}
        >
          Continue to the simulation
        </Button>
      </div>
    </div>
  )
}
