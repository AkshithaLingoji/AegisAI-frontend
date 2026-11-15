import type { ExperimentResult } from '@/domain'

export interface ExperimentsService {
  /**
   * Recorded runs. Every number the UI shows about outcomes must be derived
   * from these records — never supplied as a separate aggregate.
   */
  listExperiments(): Promise<ExperimentResult[]>
}
