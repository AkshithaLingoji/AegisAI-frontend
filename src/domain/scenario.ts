import type { Extensible } from './common'
import type { UserTask } from './task'

/**
 * A demonstration scenario (e.g. FIN-01). Not one of the eleven interfaces
 * named in the original brief — added because the UI needs a catalogue to
 * group executions. Same PROVISIONAL status as everything in src/domain.
 * @provisional
 */
export interface Scenario {
  /** Short code shown to people, e.g. "FIN-01". */
  id: string
  title: string
  domain: Extensible<'finance' | 'health'>
  /** Whether the task is ordinary or contains an attack. Descriptive only. */
  category: Extensible<'legitimate' | 'adversarial'>
  /** One plain-language sentence about what the scenario demonstrates. */
  summary: string
  task: UserTask
  /** Resources the scenario touches, for before/after reporting. */
  resourceIds: string[]
}
