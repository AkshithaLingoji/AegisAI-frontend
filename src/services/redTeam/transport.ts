/**
 * ⚠️ PROVISIONAL transport shapes — a GUESS at the Red-Team backend's JSON, based only
 * on the conceptual structure in the backend assignment (scenario_id, category,
 * description, input, expected_behavior). NOT the official schema; every field name
 * here needs confirming with the backend developer. Nothing outside src/services
 * may import this file.
 *
 * Mapping functions accept `unknown`, so an unexpected shape produces a clear
 * validation error instead of a silent default.
 */
export interface ScenarioTransport {
  scenario_id: string
  /** A category id, or an object carrying one. */
  category: string | { id: string; label?: string }
  description: string
  /** Text, or an object of named fields. */
  input: string | Record<string, unknown>
  /** A sentence, or an object with a `summary`. */
  expected_behavior: string | { summary: string; [key: string]: unknown }
  title?: string
}

export interface ExecutionTransport {
  execution_id: string
  scenario_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  requested_at: string
  started_at?: string
  finished_at?: string
  error?: string
  result_available?: boolean
}

export interface OutcomeTransport {
  /** Absent means a normal evaluation (the four findings below must then be present). */
  status?: 'evaluated' | 'unknown' | 'infrastructure_failure'
  reason?: string
  attempted?: boolean | null
  detected?: boolean | null
  blocked?: boolean | null
  successful?: boolean | null
}

export interface ResultTransport {
  execution_id: string
  scenario_id: string
  outcome: OutcomeTransport
  evidence?: { id: string; kind: string; summary: string; recorded_at?: string; content?: string }[]
  evaluated_at?: string
}

export interface ReportTransport {
  report_id: string
  title: string
  formats: string[]
  created_at?: string
  execution_ids?: string[]
}
