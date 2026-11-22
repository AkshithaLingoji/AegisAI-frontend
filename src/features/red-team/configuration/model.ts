import type { ScenarioDefinition } from '@/domain'
import type { Agent, AgentTool, ResourceMetadata } from '@/domain'

/**
 * PROVISIONAL, frontend-only. A draft of an experiment the user is configuring.
 * It is NOT a backend request and not the backend's schema: nothing here has been
 * confirmed with the Red-Team backend, and it is never sent anywhere. It lives in the
 * URL (see `readDraft` / `writeDraft`) so a configuration is shareable and survives
 * back/forward. See docs/RED-TEAM-LAB.md.
 */
export const EXPERIMENT_MODES = ['paired', 'baseline', 'protected'] as const
export type ExperimentMode = (typeof EXPERIMENT_MODES)[number]
export type Condition = 'baseline' | 'protected'

/** Paired Comparison is the recommended experience and the default. */
export const DEFAULT_MODE: ExperimentMode = 'paired'

export interface ExperimentDraft {
  scenarioId: string | null
  agentId: string | null
  resourceIds: string[]
  /** Kept as read, so an unsupported value in a URL is reported rather than silently replaced. */
  mode: string
}

export const isExperimentMode = (v: string): v is ExperimentMode => (EXPERIMENT_MODES as readonly string[]).includes(v)

/** The conditions a mode asks for, baseline first. */
export const conditionsFor = (mode: ExperimentMode): Condition[] => (mode === 'paired' ? ['baseline', 'protected'] : [mode])

export function readDraft(params: URLSearchParams): ExperimentDraft {
  const unique = [...new Set(params.getAll('resource').filter((r) => r !== ''))]
  return {
    scenarioId: params.get('scenario') || null,
    agentId: params.get('agent') || null,
    resourceIds: unique,
    mode: params.get('mode') ?? DEFAULT_MODE,
  }
}

export function writeDraft(draft: ExperimentDraft): URLSearchParams {
  const p = new URLSearchParams()
  if (draft.scenarioId) p.set('scenario', draft.scenarioId)
  if (draft.agentId) p.set('agent', draft.agentId)
  for (const r of draft.resourceIds) p.append('resource', r)
  p.set('mode', draft.mode)
  return p
}

export interface ConfigurationContext {
  scenarios: readonly ScenarioDefinition[]
  agents: readonly Agent[]
  resources: readonly ResourceMetadata[]
}

export interface ConfigurationIssue {
  field: 'scenario' | 'agent' | 'resources' | 'mode'
  message: string
}

/**
 * Frontend completeness rules, checked against the data the services returned.
 * They are the frontend's own and are not claims about what the backend requires:
 * a scenario, an agent and a defined resource snapshot (at least one resource) are
 * needed to state an experiment that can be compared fairly; a mode is required.
 */
export function validateDraft(draft: ExperimentDraft, ctx: ConfigurationContext): ConfigurationIssue[] {
  const issues: ConfigurationIssue[] = []
  if (!draft.scenarioId) issues.push({ field: 'scenario', message: 'Choose a scenario from the catalogue.' })
  else if (!ctx.scenarios.some((s) => s.id === draft.scenarioId)) issues.push({ field: 'scenario', message: `“${draft.scenarioId}” is not in the scenario catalogue.` })

  if (!draft.agentId) issues.push({ field: 'agent', message: 'Choose the target agent.' })
  else if (!ctx.agents.some((a) => a.id === draft.agentId)) issues.push({ field: 'agent', message: `“${draft.agentId}” is not a known agent.` })

  if (draft.resourceIds.length === 0) issues.push({ field: 'resources', message: 'Select at least one synthetic resource, so the experiment has a defined starting snapshot.' })
  for (const id of draft.resourceIds) {
    if (!ctx.resources.some((r) => r.id === id)) issues.push({ field: 'resources', message: `“${id}” is not a known resource.` })
  }

  if (!isExperimentMode(draft.mode)) issues.push({ field: 'mode', message: `“${draft.mode}” is not a supported experiment mode.` })
  return issues
}

/**
 * The draft as plain JSON, for the review screen's "provisional" disclosure and for a
 * backend developer to see what the frontend currently collects. Clearly not a request.
 */
export function describeDraft(draft: ExperimentDraft, ctx: ConfigurationContext & { tools: readonly AgentTool[] }) {
  const mode = isExperimentMode(draft.mode) ? draft.mode : null
  const agent = ctx.agents.find((a) => a.id === draft.agentId)
  return {
    provisionalFrontendDraft: true,
    sentToBackend: false,
    scenarioId: draft.scenarioId,
    agent: agent ? { id: agent.id, name: agent.name, domain: agent.domain } : null,
    resourceIds: draft.resourceIds,
    mode,
    conditions: mode ? conditionsFor(mode) : [],
    toolIds: ctx.tools.filter((t) => t.agentId === draft.agentId).map((t) => t.id),
  }
}
