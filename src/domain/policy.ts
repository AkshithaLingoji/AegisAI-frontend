import type { Extensible, IsoTimestamp } from './common'
import type { PolicyEvaluation } from './enforcement'
import type { ActionProposal, UserTask } from './task'

/**
 * The four decisions the platform will eventually produce. The backend owns the
 * real vocabulary and spelling; the UI normalises known spellings for display and
 * shows anything else verbatim.
 * @provisional
 */
export type PolicyDecisionKey = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'DEFER'

/** @provisional */
export interface PolicyCondition {
  /** Plain-language condition, e.g. "The target resource is not on the user's permitted list". */
  when: string
  then: Extensible<PolicyDecisionKey>
  /** Reason code an evaluation carries when this condition decides the outcome. */
  reasonCode?: string
}

/**
 * A demonstration policy shown in the registry. Not an executable policy and not
 * a real AegisAI policy: there is no authoring or execution in this app.
 * @provisional
 */
export interface Policy {
  id: string
  name: string
  description: string
  category: Extensible<'access' | 'data-sharing' | 'approval' | 'context' | 'intent'>
  version: string
  status: Extensible<'active' | 'draft' | 'retired'>
  appliesTo: { domains: string[]; summary: string }
  conditions: PolicyCondition[]
  /** Reason codes whose evaluations this policy is credited for. */
  reasonCodes: string[]
  lastUpdated: IsoTimestamp
  lastUpdatedBy?: string
  demonstration: true
}

/** Something missing, incomplete or contradictory in the context an action was assessed with.
 * @provisional */
export interface ContextIssue {
  kind: Extensible<'missing' | 'incomplete' | 'contradictory'>
  /** What the issue is about, e.g. "Patient named in the request". */
  field: string
  explanation: string
}

/**
 * An evaluation that is NOT part of a recorded run: a standalone demonstration
 * case so that every decision type can be inspected. It has no gateway result and
 * nothing was executed. Same PROVISIONAL status as everything in src/domain.
 * @provisional
 */
export interface EvaluationCase {
  id: string
  /** Simulation identifier shown to people. */
  simulationId: string
  title: string
  task: UserTask
  proposal: ActionProposal
  evaluation: PolicyEvaluation
  retrievedContext?: { resourceId: string; text: string }[]
  contextIssues: ContextIssue[]
}
