/**
 * Simulation profiles and the predefined catalogue (mock only).
 *
 * A profile is DEVELOPMENT-ONLY simulation behaviour: which actions the scripted
 * agent proposes and what it "retrieves". It is deliberately not part of the
 * shared `TaskDefinition` contract. The mock never interprets the request text.
 * The four catalogue scenarios are derived from `scenarioFixtures`, so no data is
 * duplicated and no domain-specific execution logic exists.
 */
import type { TaskDefinition, TaskInput } from '@/domain'
import { resources, scenarioFixtures, type PlannedAction } from '../fixtures'

export interface SimulationProfile {
  id: string
  label: string
  description: string
  deterministic: true
  /** Id used on the proposals' `taskId` (kept so catalogue output matches earlier records). */
  taskId?: string
  /** The scripted agent's proposals. Identical for Baseline and Protected. */
  plan: PlannedAction[]
  /** Text the agent "retrieves" when a read is dispatched. Identical for both paths. */
  retrievedContent: Record<string, string>
  /** Resources reported on (before/after). */
  observedResourceIds: string[]
  /**
   * Zero-based plan positions that a SIMULATED rule routes to human approval when
   * the demonstration rules would otherwise allow them. Authored, not evaluated.
   */
  approvalRequiredActions?: number[]
}

export interface CatalogueEntry {
  task: TaskDefinition
  profile: SimulationProfile
}

/**
 * Catalogue inputs: the documents the scripted agent will retrieve, shown so the
 * user can inspect them. Trust is assigned HERE, by controlled catalogue data:
 * a document from the adversarial scenarios is `untrusted`; the others are
 * `declared-trusted`, which only means "declared trusted by the demonstration data".
 * The demonstration rules do not use trust to decide anything.
 */
function catalogueInputs(adversarial: boolean, retrievedContent: Record<string, string>): TaskInput[] {
  return Object.entries(retrievedContent).map(([resourceId, content]) => ({
    id: `retrieved-${resourceId}`,
    label: `${resources.find((r) => r.id === resourceId)?.name ?? resourceId} (document the agent retrieves)`,
    format: 'text' as const,
    content,
    trust: adversarial
      ? { level: 'untrusted' as const, assignedBy: 'catalogue' as const, reason: 'Third-party document that contains instructions the user did not write.' }
      : { level: 'declared-trusted' as const, assignedBy: 'catalogue' as const, reason: 'Declared trusted by the demonstration data. This is not a verdict that the content is safe.' },
  }))
}

export function catalogueEntries(): CatalogueEntry[] {
  return scenarioFixtures.map(({ scenario, plan, retrievedContent }) => ({
    task: {
      id: scenario.id,
      origin: 'catalogue',
      domain: scenario.domain,
      title: scenario.title,
      summary: scenario.summary,
      request: scenario.task.prompt,
      agentId: scenario.task.agentId,
      actingPrincipalId: scenario.task.principalId,
      declaredIntent: scenario.task.intent,
      selectedResourceIds: scenario.task.intent?.resourceIds ?? [],
      inputs: catalogueInputs(scenario.category === 'adversarial', retrievedContent),
      tags: ['catalogue', String(scenario.category)],
    },
    profile: {
      id: `catalogue-${scenario.id}`,
      label: `${scenario.id} scripted behaviour`,
      description: `Scripted, deterministic agent behaviour for ${scenario.id}. The request text is recorded, not interpreted.`,
      deterministic: true,
      taskId: scenario.task.id,
      plan,
      retrievedContent,
      observedResourceIds: scenario.resourceIds,
    },
  }))
}
