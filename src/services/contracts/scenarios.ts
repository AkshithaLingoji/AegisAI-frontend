import type { Scenario } from '@/domain'

export interface ScenariosService {
  listScenarios(): Promise<Scenario[]>
}
