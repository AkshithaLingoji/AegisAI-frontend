import type { Digest, RunInputSnapshot, TaskDefinition, TaskInput } from '@/domain'
import { digestCanonical, digestText, isWellFormedUtf16, utf8Bytes } from './canonical'

/** Per-input limit, in UTF-8 bytes (200 KB = 204,800 bytes). */
export const MAX_INPUT_BYTES = 204_800
/** Most inputs a single task may carry. */
export const MAX_INPUTS_PER_TASK = 5

export class InputValidationError extends Error {
  readonly issues: string[]
  constructor(issues: string[]) {
    super(`Invalid task input: ${issues.join(' ')}`)
    this.name = 'InputValidationError'
    this.issues = issues
  }
}

/** Checks inputs without changing them. Returns every problem found; empty means valid. */
export function validateInputs(inputs: TaskInput[]): string[] {
  const issues: string[] = []
  if (inputs.length > MAX_INPUTS_PER_TASK) {
    issues.push(`A task can have at most ${MAX_INPUTS_PER_TASK} inputs; ${inputs.length} were provided.`)
  }
  const seen = new Set<string>()
  for (const input of inputs) {
    if (seen.has(input.id)) issues.push(`Input id “${input.id}” is used more than once.`)
    seen.add(input.id)
    if (!isWellFormedUtf16(input.content)) {
      issues.push(`Input “${input.label}” is not valid text (unpaired surrogate) and cannot be stored as UTF-8.`)
      continue
    }
    const bytes = utf8Bytes(input.content).length
    if (bytes > MAX_INPUT_BYTES) {
      issues.push(`Input “${input.label}” is ${bytes} bytes; the limit is ${MAX_INPUT_BYTES} bytes. It was not truncated.`)
    }
  }
  return issues
}

/**
 * Immutable snapshots of exactly what the agent receives. Content is kept
 * byte-for-byte: no trimming, normalisation or truncation, before or after hashing.
 * Throws `InputValidationError` (never silently shortens) when inputs are invalid.
 */
export function snapshotInputs(inputs: TaskInput[], origin: TaskDefinition['origin']): RunInputSnapshot[] {
  const issues = validateInputs(inputs)
  if (origin !== 'catalogue') {
    // Trust is assigned by controlled catalogue data only. Supplied trust metadata on
    // custom / user-provided inputs is never honoured: attempts are rejected, not downgraded.
    for (const input of inputs) {
      if (input.trust.level !== 'untrusted' || input.trust.assignedBy !== 'default') {
        issues.push(`Input “${input.label}” claims trust (${input.trust.level}, assigned by ${input.trust.assignedBy}); only controlled catalogue definitions may assign it.`)
      }
    }
  }
  if (issues.length > 0) throw new InputValidationError(issues)
  return inputs.map((input) => ({
    inputId: input.id,
    label: input.label,
    format: input.format,
    content: input.content,
    byteLength: utf8Bytes(input.content).length,
    contentDigest: digestText(input.content),
    trust: { ...input.trust },
  }))
}

/**
 * Digest of the inputs that matters for "equivalent inputs": ids, formats, content
 * digests and trust, ordered by input id so listing order does not matter.
 */
export function computeInputsDigest(snapshots: RunInputSnapshot[]): Digest {
  const items = snapshots
    .map((s) => ({ inputId: s.inputId, format: s.format, contentDigest: s.contentDigest, trust: s.trust }))
    .sort((a, b) => (a.inputId < b.inputId ? -1 : a.inputId > b.inputId ? 1 : 0))
  return digestCanonical(items)
}
