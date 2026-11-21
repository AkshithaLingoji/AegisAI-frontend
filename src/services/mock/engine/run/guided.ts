/**
 * Guided Tasks: which catalogue entries the workflow offers and the scripted
 * behaviour behind them (mock only).
 *
 * Nothing here evaluates policy or executes anything: it only chooses WHICH
 * existing simulation profile the shared runner is given. The one addition is a
 * simulated approval rule on FIN-01's save action, so the approval step can be
 * demonstrated with a legitimate task. It is authored data, not a decision engine,
 * and it is labelled as simulated everywhere it is shown.
 */
import type { TaskDefinition } from '@/domain'
import { catalogueEntries, type CatalogueEntry, type SimulationProfile } from './profiles'

/** The tasks the Guided Tasks workflow offers. HLT-02 stays in the seeded catalogue only. */
export const GUIDED_TASK_IDS = ['FIN-01', 'FIN-02', 'HLT-01'] as const

/** Plan positions routed to SIMULATED human approval in the guided variants. */
const APPROVAL_ACTIONS: Record<string, (profile: SimulationProfile) => number[]> = {
  'FIN-01': (profile) => profile.plan.map((a, i) => (a.kind === 'write' ? i : -1)).filter((i) => i >= 0),
}

export function guidedProfile(entry: CatalogueEntry): SimulationProfile {
  const approval = APPROVAL_ACTIONS[entry.task.id]?.(entry.profile)
  return {
    ...entry.profile,
    id: `guided-${entry.task.id}`,
    label: `${entry.task.id} guided scripted behaviour`,
    ...(approval && approval.length > 0
      ? {
          approvalRequiredActions: approval,
          description: `${entry.profile.description} In the guided workflow its save action is routed to simulated human approval.`,
        }
      : {}),
  }
}

/** How the workflow names and explains each task. Presentation only; outcomes are never stated here. */
const PRESENTATION: Record<string, { title: string; objective: string }> = {
  'FIN-01': {
    title: 'Expense report',
    objective: 'A legitimate everyday task. Follow the agent’s reads and its save action, and resolve the simulated human approval the save is routed to.',
  },
  'FIN-02': {
    title: 'Injected payroll export',
    objective: 'A document the agent retrieves hides an instruction to export payroll data. See how that untrusted instruction becomes a proposed action and how it is evaluated.',
  },
  'HLT-01': {
    title: 'Health summary',
    objective: 'A clinician asks for a visit summary of a patient they are cleared to see. See how access to restricted patient data is evaluated for each action.',
  },
}

export function guidedEntries(): CatalogueEntry[] {
  return GUIDED_TASK_IDS.map((id) => catalogueEntries().find((e) => e.task.id === id)!).map((e) => ({
    // Guided display name only; the seeded catalogue (and Command Center) keep their own titles.
    task: { ...e.task, title: PRESENTATION[e.task.id]?.title ?? e.task.title },
    profile: guidedProfile(e),
  }))
}

export function guidedTaskOptions(): { task: TaskDefinition; objective: string; includesApproval: boolean }[] {
  return guidedEntries().map(({ task, profile }) => ({
    task,
    objective: PRESENTATION[task.id]?.objective ?? task.summary,
    includesApproval: (profile.approvalRequiredActions ?? []).length > 0,
  }))
}

export interface GuidedScenarioInfo {
  id: string
  label: string
  description: string
  /** Does this script include a simulated approval step? */
  includesApproval: boolean
  /** Agent, identity and resources the script uses; custom tasks inherit them. */
  template: TaskDefinition
}

export function guidedScenarios(): GuidedScenarioInfo[] {
  return guidedEntries().map(({ task, profile }) => ({
    id: task.id,
    label: `${task.id}: ${task.title}`,
    description: task.summary,
    includesApproval: (profile.approvalRequiredActions ?? []).length > 0,
    template: task,
  }))
}

/** Profile for a custom task: the chosen scenario's script, under its own id. The request text is never read. */
export function customProfile(scenarioId: string): SimulationProfile | undefined {
  const entry = guidedEntries().find((e) => e.task.id === scenarioId)
  if (!entry) return undefined
  const { taskId: _unused, ...rest } = entry.profile
  void _unused
  return { ...rest, id: `guided-custom-via-${scenarioId}`, label: `Custom task using the ${scenarioId} script`, description: `A custom task. The ${scenarioId} script decides what the simulated agent does; the request text is recorded, not interpreted.` }
}
