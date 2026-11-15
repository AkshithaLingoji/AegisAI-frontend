import type { ExecutionSource } from '@/domain'

/** Describes the system currently feeding the UI. */
export interface SourceInfo {
  source: ExecutionSource
  /** Plain-language description shown in the UI. */
  description: string
}

export interface SystemService {
  /**
   * Resolves with what is actually serving data. For the backend source this
   * must only resolve once the backend has been reached — it must reject (not
   * resolve as mock) when the backend cannot be contacted.
   */
  getSourceInfo(): Promise<SourceInfo>
}
