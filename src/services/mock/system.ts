import type { SystemService } from '../contracts'

export function createMockSystemService(): SystemService {
  return {
    async getSourceInfo() {
      return {
        source: 'mock',
        description:
          'Deterministic synthetic data produced by the in-browser development mock. Nothing here is evidence from the AegisAI backend.',
      }
    },
  }
}
