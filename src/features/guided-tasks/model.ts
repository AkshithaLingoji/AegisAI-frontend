import type { Tone } from '@/components/ui/tones'
import type { ResourceMetadata, RunRecord, TaskDefinition, TaskInput } from '@/domain'
import { isWellFormedUtf16, utf8Bytes } from '@/lib/runs/canonical'
import { deriveProposalOutcome, type ProposalOutcome } from '@/lib/runs/compare'
import { MAX_INPUT_BYTES, MAX_INPUTS_PER_TASK, validateInputs } from '@/lib/runs/inputs'
import type { CustomDraft } from '@/state/guidedStore'

export type DecisionKey = 'allow' | 'deny' | 'require_approval' | 'defer' | 'other' | 'none'

export interface ActionView {
  proposalId: string
  sequence: number
  kind: string
  resourceId: string
  resourceName: string
  sensitivity?: string
  summary: string
  rationale?: string
  decisionKey: DecisionKey
  /** The decision exactly as recorded (verbatim for unknown values); null when none was made. */
  decisionRaw: string | null
  reasons: { code: string; message: string }[]
  policyRefs: string[]
  outcome: ProposalOutcome
  /** Set only while this action's approval request is still unresolved. */
  pendingRequestId?: string
  approvalNote?: string
  /** One plain sentence built ONLY from the recorded facts. */
  headline: string
  tone: Tone
}

const KNOWN: Record<string, DecisionKey> = { allow: 'allow', deny: 'deny', require_approval: 'require_approval', defer: 'defer' }
export const decisionKey = (raw: string | null): DecisionKey => (raw === null ? 'none' : (KNOWN[raw.toLowerCase().replace(/[\s-]+/g, '_')] ?? 'other'))

/**
 * Describes ONE action from the separate recorded facts. A decision is never read
 * as proof of execution: the wording depends on the gateway and execution records.
 */
function describe(o: ProposalOutcome): { headline: string; tone: Tone } {
  if (o.approval === 'pending') return { headline: 'Waiting for a simulated approval. It has not been dispatched and has not run.', tone: 'peach' }
  if (o.approval === 'rejected') return { headline: 'Approval was rejected: it was blocked and did not run.', tone: 'red' }
  if (o.approval === 'approved') {
    return o.execution === 'ran'
      ? { headline: 'Approval was granted: it was dispatched and ran.', tone: 'mint' }
      : { headline: `Approval was granted, but it did not run (${o.execution ?? 'no execution recorded'}).`, tone: 'peach' }
  }
  if (o.gateway === 'blocked') return { headline: 'Denied by the evaluation: blocked at the gateway and did not run.', tone: 'red' }
  if (o.execution === 'ran') return { headline: 'Allowed by the evaluation: dispatched and ran.', tone: 'mint' }
  if (o.execution === 'failed') return { headline: 'Dispatched, but the execution failed.', tone: 'peach' }
  if (o.execution === 'not_run') return { headline: 'It did not run.', tone: 'neutral' }
  return { headline: 'No outcome recorded yet.', tone: 'neutral' }
}

export function buildActionViews(run: RunRecord, resources: ResourceMetadata[]): ActionView[] {
  return [...run.proposals]
    .sort((a, b) => a.sequence - b.sequence)
    .map((p) => {
      const outcome = deriveProposalOutcome(run, p.id)
      const decision = run.decisions.find((d) => d.proposalId === p.id)
      const request = run.approvalRequests.find((r) => r.proposalId === p.id)
      const resolution = request ? run.approvalResolutions.find((r) => r.requestId === request.id) : undefined
      const resource = resources.find((r) => r.id === p.targetResourceId)
      const { headline, tone } = describe(outcome)
      return {
        proposalId: p.id,
        sequence: p.sequence,
        kind: String(p.kind),
        resourceId: p.targetResourceId,
        resourceName: resource?.name ?? p.targetResourceId,
        ...(resource?.sensitivity ? { sensitivity: String(resource.sensitivity) } : {}),
        summary: p.summary,
        ...(p.rationale ? { rationale: p.rationale } : {}),
        decisionKey: decisionKey(outcome.decision),
        decisionRaw: outcome.decision,
        reasons: decision?.reasons ?? [],
        policyRefs: decision?.policyRefs ?? [],
        outcome,
        ...(request && !resolution ? { pendingRequestId: request.id } : {}),
        ...(resolution?.note ? { approvalNote: resolution.note } : {}),
        headline,
        tone,
      }
    })
}

export interface RunSummary {
  proposed: number
  ran: number
  blocked: number
  failed: number
  pendingApprovals: number
  /** Short, factual status line. */
  statusLabel: string
  statusTone: Tone
}

export function summariseRun(run: RunRecord): RunSummary {
  const views = run.proposals.map((p) => deriveProposalOutcome(run, p.id))
  const ran = views.filter((v) => v.execution === 'ran').length
  const blocked = views.filter((v) => v.gateway === 'blocked').length
  const failed = views.filter((v) => v.execution === 'failed').length
  const pendingApprovals = views.filter((v) => v.approval === 'pending').length
  const proposed = views.length
  if (run.status === 'awaiting_approval') {
    return { proposed, ran, blocked, failed, pendingApprovals, statusLabel: 'Paused: waiting for approval', statusTone: 'peach' }
  }
  if (failed > 0) return { proposed, ran, blocked, failed, pendingApprovals, statusLabel: `Completed with ${failed} failed ${failed === 1 ? 'action' : 'actions'}`, statusTone: 'peach' }
  if (ran === proposed) return { proposed, ran, blocked, failed, pendingApprovals, statusLabel: 'Completed: every proposed action ran', statusTone: 'mint' }
  return { proposed, ran, blocked, failed, pendingApprovals, statusLabel: `Completed partially: ${ran} of ${proposed} actions ran`, statusTone: blocked > 0 ? 'red' : 'peach' }
}

export interface ChangedResource {
  resourceId: string
  name: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

/** Observed resources whose recorded state differs between start and now. */
export function changedResources(run: RunRecord, resources: ResourceMetadata[]): ChangedResource[] {
  return run.stateChanges
    .filter((c) => JSON.stringify(c.before) !== JSON.stringify(c.after))
    .map((c) => ({ resourceId: c.resourceId, name: resources.find((r) => r.id === c.resourceId)?.name ?? c.resourceId, before: c.before, after: c.after }))
}

export const shortDigest = (hex: string) => `${hex.slice(0, 12)}…`

export function eventTone(kind: string, run: RunRecord, proposalId?: string): Tone {
  if (kind === 'blocked' || kind === 'execution_failed') return 'red'
  if (kind === 'approval_requested') return 'peach'
  if (kind === 'approval_resolved') return proposalId && run.approvalResolutions.some((r) => r.outcome === 'rejected') ? 'peach' : 'lavender'
  if (kind === 'executed' || kind === 'dispatched') return 'mint'
  return 'neutral'
}

// ───────────────────────── custom task drafting ─────────────────────────


export { MAX_INPUT_BYTES, MAX_INPUTS_PER_TASK }

/** UTF-8 size of an input, or null when the text cannot be stored as UTF-8 (unpaired surrogate). */
export const inputBytes = (content: string): number | null => (isWellFormedUtf16(content) ? utf8Bytes(content).length : null)

/** Custom inputs are ALWAYS untrusted by default. The form has no control that can change this. */
export const CUSTOM_TRUST = { level: 'untrusted', assignedBy: 'default', reason: 'User-provided content is untrusted by default.' } as const

/** Builds the task exactly as typed (request is never trimmed or rewritten). */
export function buildCustomTask(draft: CustomDraft, template: TaskDefinition): TaskDefinition {
  const inputs: TaskInput[] = draft.inputs.map((input, i) => ({
    id: `input-${i + 1}`,
    label: input.label.trim() || `Input ${i + 1}`,
    format: input.format,
    content: input.content,
    trust: { ...CUSTOM_TRUST },
  }))
  return {
    id: 'custom-guided',
    origin: 'custom',
    domain: template.domain,
    title: draft.name.trim(),
    summary: 'A custom task. The selected script decides what the simulated agent does; the request text is recorded, not interpreted.',
    request: draft.request,
    agentId: template.agentId,
    actingPrincipalId: template.actingPrincipalId,
    selectedResourceIds: [...template.selectedResourceIds],
    inputs,
    tags: ['custom'],
  }
}

export interface DraftValidation {
  issues: string[]
  /** Per-input messages keyed by the draft input key. */
  inputIssues: Record<string, string[]>
  valid: boolean
}

export function validateDraft(draft: CustomDraft, template: TaskDefinition | undefined): DraftValidation {
  const issues: string[] = []
  const inputIssues: Record<string, string[]> = {}
  if (!draft.name.trim()) issues.push('Give the task a name.')
  if (!draft.request.trim()) issues.push('Describe what the agent is asked to do.')
  if (!draft.scenarioId || !template) issues.push('Choose which supported script the simulated agent follows.')
  if (draft.inputs.length > MAX_INPUTS_PER_TASK) issues.push(`A task can have at most ${MAX_INPUTS_PER_TASK} inputs.`)
  draft.inputs.forEach((input) => {
    const found: string[] = []
    const bytes = inputBytes(input.content)
    if (bytes === null) found.push('This text contains a character that cannot be stored as UTF-8.')
    else if (bytes > MAX_INPUT_BYTES) found.push(`This input is ${bytes.toLocaleString('en-GB')} bytes; the limit is ${MAX_INPUT_BYTES.toLocaleString('en-GB')} bytes. It will not be truncated: shorten it yourself.`)
    if (found.length > 0) inputIssues[input.key] = found
  })
  // Defer to the shared validator as well, so the UI can never accept what the engine rejects.
  if (template && draft.scenarioId && Object.keys(inputIssues).length === 0) {
    for (const message of validateInputs(buildCustomTask(draft, template).inputs)) issues.push(message)
  }
  return { issues, inputIssues, valid: issues.length === 0 && Object.keys(inputIssues).length === 0 }
}
