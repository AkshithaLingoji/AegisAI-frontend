/**
 * Assurance & Policy view model.
 *
 * Every figure is derived from records returned by the services: run evaluations
 * (from experiments), standalone evaluation cases, policies, identities, resources
 * and scenarios. Nothing here evaluates anything or decides what is permitted:
 * "mismatch", "restricted" and "needs attention" restate recorded data, and the
 * decisions are exactly the ones the records carry.
 */
import type {
  Agent,
  AuthenticatedPrincipal,
  ContextIssue,
  EvaluationCase,
  ExperimentResult,
  GatewayResult,
  ActionProposal,
  PolicyDecisionKey,
  PolicyEvaluation,
  Policy,
  ResourceMetadata,
  Scenario,
  UserTask,
} from '@/domain'

export interface AssuranceInput {
  agents: Agent[]
  principals: AuthenticatedPrincipal[]
  scenarios: Scenario[]
  resources: ResourceMetadata[]
  experiments: ExperimentResult[]
  policies: Policy[]
  cases: EvaluationCase[]
}

/* ---------- decisions ---------- */

export type DecisionKey = PolicyDecisionKey | 'OTHER'
export const DECISION_ORDER: PolicyDecisionKey[] = ['ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'DEFER']

export interface NormalisedDecision {
  key: DecisionKey
  /** The value exactly as recorded. Shown verbatim for anything unrecognised. */
  raw: string
}

/** Known spellings only; `escalate` and anything else is never guessed at. */
export function normaliseDecision(raw: string): NormalisedDecision {
  const k = raw.trim().toUpperCase().replace(/[\s-]+/g, '_')
  return (DECISION_ORDER as string[]).includes(k) ? { key: k as PolicyDecisionKey, raw } : { key: 'OTHER', raw }
}

/* ---------- views ---------- */

export type CheckStatus = 'match' | 'mismatch' | 'unknown'
export interface Check {
  status: CheckStatus
  /** What the request says. */
  intent: string
  /** What the action does. */
  action: string
  note?: string
}

export interface Verification {
  overall: CheckStatus
  headline: string
  subject: Check
  operation: Check
  identity: Check
}

export interface ResourceContext {
  id: string
  name: string
  kind?: string
  owner?: string
  classification?: string
}

export type ExecutionState = 'executed' | 'not-executed' | 'not-run'

export interface EvaluationView {
  /** The evaluation record's id. */
  id: string
  simulationId: string
  origin: 'run' | 'case'
  title: string
  evaluatedAt: string
  decision: NormalisedDecision
  agent: Agent
  principal?: AuthenticatedPrincipal
  scenarioId?: string
  task: UserTask
  proposal: ActionProposal
  evaluation: PolicyEvaluation
  resource: ResourceContext
  /** `undefined` = the identity record does not say. */
  resourcePermitted: boolean | undefined
  operationGranted: boolean | undefined
  policies: Policy[]
  verification: Verification
  issues: ContextIssue[]
  retrieved: { resourceName: string; text: string }[]
  gateway?: GatewayResult
  execution: { state: ExecutionState; text: string }
  evidenceIds: string[]
  /** Where the surrounding run can be inspected, for run evaluations. */
  agentLink?: string
}

export interface PolicyView {
  policy: Policy
  evaluations: number
  byDecision: Record<DecisionKey, number>
}

export interface AgentAssurance {
  agent: Agent
  evaluations: number
  byDecision: Record<DecisionKey, number>
  mismatches: number
  withIssues: number
  /** Evaluations that were denied, deferred, need approval, mismatch or have context issues. */
  needingAttention: number
}

export interface Warning {
  id: string
  evaluationId: string
  kind: 'mismatch' | 'missing-context' | 'denied' | 'deferred' | 'approval'
  text: string
}

export interface IdentityView {
  agent: Agent
  principal?: AuthenticatedPrincipal
  environment?: string
  permitted: ResourceContext[]
  restricted: ResourceContext[]
  /** Kinds of action (read, write …) on the user's granted list. */
  grantedActions: string[]
}

export interface AssuranceModel {
  identities: IdentityView[]
  policies: PolicyView[]
  policyStats: { total: number; byStatus: Record<string, number>; versions: { id: string; version: string }[] }
  evaluations: EvaluationView[] // newest first
  totals: { evaluations: number; runEvaluations: number; caseEvaluations: number; byDecision: Record<DecisionKey, number> }
  agents: AgentAssurance[]
  warnings: Warning[]
}
