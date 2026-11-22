import type {
  AttackOutcome,
  EvidenceRecord,
  ExecutionLifecycle,
  ExpectedBehavior,
  Finding,
  JsonValue,
  Provenance,
  ReportReference,
  ScenarioDefinition,
  ScenarioExecutionStatus,
  ScenarioInput,
  ScenarioResult,
} from '@/domain'
import { RedTeamServiceError } from '../contracts'

/**
 * Backend → frontend mapping. The ONLY place raw backend JSON is read. It validates
 * the fields the frontend needs and throws one `RedTeamServiceError('invalid-data')`
 * listing every problem; it never fills a missing required field with a guess.
 * It does not decide anything about attacks: it only translates what was reported.
 * PROVISIONAL: the source field names are unconfirmed (see ./transport.ts).
 */

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)

function isJson(v: unknown): v is JsonValue {
  if (v === null || ['string', 'boolean'].includes(typeof v)) return true
  if (typeof v === 'number') return Number.isFinite(v)
  if (Array.isArray(v)) return v.every(isJson)
  return isRec(v) && Object.values(v).every(isJson)
}

class Reader {
  readonly issues: string[] = []
  constructor(readonly what: string) {}
  fail(message: string) {
    this.issues.push(message)
  }
  record(v: unknown): Rec {
    if (!isRec(v)) {
      this.fail('is not an object.')
      return {}
    }
    return v
  }
  str(r: Rec, key: string): string {
    const v = r[key]
    if (typeof v !== 'string' || v.trim() === '') {
      this.fail(`“${key}” must be a non-empty string.`)
      return ''
    }
    return v
  }
  optStr(r: Rec, key: string): string | undefined {
    const v = r[key]
    if (v === undefined) return undefined
    if (typeof v !== 'string') {
      this.fail(`“${key}” must be a string when present.`)
      return undefined
    }
    return v
  }
  done<T>(value: T): T {
    if (this.issues.length > 0) {
      throw new RedTeamServiceError('invalid-data', `Invalid ${this.what} from the source.`, this.issues.map((i) => `${this.what}: ${i}`))
    }
    return value
  }
}

export function mapScenario(raw: unknown, provenance: Provenance): ScenarioDefinition {
  const r = new Reader('scenario')
  const rec = r.record(raw)
  const id = r.str(rec, 'scenario_id')

  let categoryId = ''
  const category = rec.category
  if (typeof category === 'string' && category.trim() !== '') categoryId = category
  else if (isRec(category) && typeof category.id === 'string' && category.id.trim() !== '') categoryId = category.id
  else r.fail('“category” must be a non-empty string or an object with an “id”.')

  const description = r.str(rec, 'description')

  let input: ScenarioInput = { format: 'text', text: '' }
  if (typeof rec.input === 'string') input = { format: 'text', text: rec.input }
  else if (isRec(rec.input) && isJson(rec.input)) input = { format: 'structured', fields: rec.input as Record<string, JsonValue> }
  else r.fail('“input” must be text or a JSON object.')

  let expected: ExpectedBehavior = { summary: '' }
  const eb = rec.expected_behavior
  if (typeof eb === 'string' && eb.trim() !== '') expected = { summary: eb }
  else if (isRec(eb) && typeof eb.summary === 'string' && eb.summary.trim() !== '') {
    const { summary, ...rest } = eb
    if (Object.keys(rest).length === 0) expected = { summary }
    else if (isJson(rest)) expected = { summary, details: rest as Record<string, JsonValue> }
    else {
      // Never drop data silently: details that are not valid JSON are reported.
      expected = { summary }
      r.fail('“expected_behavior” has additional details that are not valid JSON.')
    }
  } else r.fail('“expected_behavior” must be text or an object with a “summary”.')

  const title = r.optStr(rec, 'title')
  return r.done({ id, categoryId, ...(title ? { title } : {}), description, input, expectedBehavior: expected, provenance })
}

const LIFECYCLES: readonly ExecutionLifecycle[] = ['pending', 'running', 'completed', 'failed']

export function mapExecutionStatus(raw: unknown, provenance: Provenance): ScenarioExecutionStatus {
  const r = new Reader('execution')
  const rec = r.record(raw)
  const executionId = r.str(rec, 'execution_id')
  const scenarioId = r.str(rec, 'scenario_id')
  const requestedAt = r.str(rec, 'requested_at')
  let lifecycle: ExecutionLifecycle = 'pending'
  if (LIFECYCLES.includes(rec.status as ExecutionLifecycle)) lifecycle = rec.status as ExecutionLifecycle
  else r.fail(`“status” must be one of ${LIFECYCLES.join(', ')}.`)
  const startedAt = r.optStr(rec, 'started_at')
  const finishedAt = r.optStr(rec, 'finished_at')
  const error = r.optStr(rec, 'error')
  if (rec.result_available !== undefined && typeof rec.result_available !== 'boolean') r.fail('“result_available” must be a boolean when present.')
  return r.done({
    executionId,
    scenarioId,
    lifecycle,
    requestedAt,
    ...(startedAt ? { startedAt } : {}),
    ...(finishedAt ? { finishedAt } : {}),
    // A failure reason belongs to a failed LIFECYCLE only; it is never an attack verdict.
    ...(lifecycle === 'failed' ? { failureReason: error ?? 'The source gave no reason.' } : {}),
    resultAvailable: rec.result_available === true,
    provenance,
  })
}

const finding = (r: Reader, rec: Rec, key: string): Finding => {
  const v = rec[key]
  if (v === true) return 'yes'
  if (v === false) return 'no'
  if (v === null) return 'unknown'
  r.fail(`outcome “${key}” must be true, false or null (unknown); a missing value is not treated as “no”.`)
  return 'unknown'
}

export function mapResult(raw: unknown, provenance: Provenance): ScenarioResult {
  const r = new Reader('result')
  const rec = r.record(raw)
  const executionId = r.str(rec, 'execution_id')
  const scenarioId = r.str(rec, 'scenario_id')
  const o = r.record(rec.outcome)
  let outcome: AttackOutcome = { status: 'unknown', reason: '' }
  if (o.status === 'infrastructure_failure' || o.status === 'unknown') {
    const reason = r.str(o, 'reason')
    outcome = { status: o.status, reason }
  } else if (o.status === undefined || o.status === 'evaluated') {
    outcome = {
      status: 'evaluated',
      evaluation: { attempted: finding(r, o, 'attempted'), detected: finding(r, o, 'detected'), blocked: finding(r, o, 'blocked'), successful: finding(r, o, 'successful') },
    }
  } else r.fail('outcome “status” must be evaluated, unknown or infrastructure_failure.')

  const evidence: EvidenceRecord[] = []
  if (rec.evidence !== undefined && !Array.isArray(rec.evidence)) r.fail('“evidence” must be a list when present.')
  else {
    for (const item of (rec.evidence as unknown[] | undefined) ?? []) {
      const e = new Reader('evidence')
      const er = e.record(item)
      const id = e.str(er, 'id')
      const kind = e.str(er, 'kind')
      const summary = e.str(er, 'summary')
      const recordedAt = e.optStr(er, 'recorded_at')
      const content = e.optStr(er, 'content')
      r.issues.push(...e.issues.map((i) => `evidence: ${i}`))
      evidence.push({ id, kind, summary, ...(recordedAt ? { recordedAt } : {}), ...(content ? { content } : {}) })
    }
  }
  const evaluatedAt = r.optStr(rec, 'evaluated_at')
  return r.done({ executionId, scenarioId, outcome, evidence, ...(evaluatedAt ? { evaluatedAt } : {}), provenance })
}

export function mapReport(raw: unknown, provenance: Provenance): ReportReference {
  const r = new Reader('report')
  const rec = r.record(raw)
  const id = r.str(rec, 'report_id')
  const title = r.str(rec, 'title')
  const stringList = (key: string, required: boolean): string[] => {
    const v = rec[key]
    if (v === undefined && !required) return []
    if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
      r.fail(`“${key}” must be a list of strings.`)
      return []
    }
    return v as string[]
  }
  const formats = stringList('formats', true)
  const executionIds = stringList('execution_ids', false)
  const createdAt = r.optStr(rec, 'created_at')
  return r.done({ id, title, formats, ...(createdAt ? { createdAt } : {}), executionIds, provenance })
}
