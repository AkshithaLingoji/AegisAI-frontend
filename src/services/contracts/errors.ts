/** Thrown by backend adapters that are not implemented or cannot be reached. */
export class NotConnectedError extends Error {
  override name = 'NotConnectedError'
}

export type RunServiceErrorCode =
  | 'invalid-input'
  | 'invalid-request'
  | 'unknown-run'
  | 'unknown-approval-request'
  | 'already-resolved'
  | 'conflict'

/** A run operation was refused. `issues` carries every validation message, if any. */
export class RunServiceError extends Error {
  override name = 'RunServiceError'
  readonly code: RunServiceErrorCode
  readonly issues: string[]
  constructor(code: RunServiceErrorCode, message: string, issues: string[] = []) {
    super(message)
    this.code = code
    this.issues = issues
  }
}
