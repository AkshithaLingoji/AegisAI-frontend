import type { RunRecord, TaskDefinition } from '@/domain'
import { InputValidationError } from '@/lib/runs/inputs'
import { RunServiceError, type GuidedTaskOption, type ResolveApprovalRequest, type RunsService, type SimulationScenarioOption, type StartRunRequest, type TasksService } from '../contracts'
import { customProfile, guidedEntries, guidedScenarios, guidedTaskOptions } from './engine/run/guided'
import type { SimulationProfile } from './engine/run/profiles'
import { ApprovalError, resolveApproval, runTask } from './engine/run/runner'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export interface MockRunsOptions {
  latencyMs?: number
  /** Wall clock for run timestamps. Injectable so tests are deterministic. */
  now?: () => number
}

/**
 * Guided-workflow services backed by the shared run engine. Runs are kept in
 * memory for this session only. Callers always receive copies.
 */
export function createMockTaskServices({ latencyMs = 0, now = Date.now }: MockRunsOptions = {}): { tasks: TasksService; runs: RunsService } {
  const store = new Map<string, { run: RunRecord; profile: SimulationProfile }>()
  let counter = 0
  const wait = () => (latencyMs > 0 ? new Promise<void>((r) => setTimeout(r, latencyMs)) : Promise.resolve())

  const tasks: TasksService = {
    async listTasks(): Promise<GuidedTaskOption[]> {
      await wait()
      return clone(guidedTaskOptions())
    },
    async listSimulationScenarios(): Promise<SimulationScenarioOption[]> {
      await wait()
      return clone(guidedScenarios())
    },
  }

  const runs: RunsService = {
    async startRun({ task, simulationScenarioId }: StartRunRequest) {
      await wait()
      let profile: SimulationProfile | undefined
      let controlled: TaskDefinition
      if (task.origin === 'catalogue') {
        // Catalogue runs use the CONTROLLED definition, never the caller's copy.
        const entry = guidedEntries().find((e) => e.task.id === task.id)
        if (!entry) throw new RunServiceError('invalid-request', `“${task.id}” is not a guided catalogue task.`)
        profile = entry.profile
        controlled = entry.task
      } else {
        const entry = simulationScenarioId ? guidedEntries().find((e) => e.task.id === simulationScenarioId) : undefined
        profile = simulationScenarioId ? customProfile(simulationScenarioId) : undefined
        if (!entry || !profile) throw new RunServiceError('invalid-request', 'A custom task needs a supported simulation scenario to follow.')
        // The script fixes the agent and simulated identity; the caller supplies the text and inputs.
        controlled = { ...task, agentId: entry.task.agentId, actingPrincipalId: entry.task.actingPrincipalId, selectedResourceIds: [...entry.task.selectedResourceIds] }
      }
      counter += 1
      const runId = `run-guided-${counter}`
      let run: RunRecord
      try {
        run = runTask(controlled, { runId, path: 'protected', startMs: now(), profile })
      } catch (e) {
        if (e instanceof InputValidationError) throw new RunServiceError('invalid-input', e.message, e.issues)
        throw e
      }
      store.set(runId, { run, profile })
      return clone(run)
    },

    async resolveApproval({ runId, requestId, outcome, note }: ResolveApprovalRequest) {
      await wait()
      const entry = store.get(runId)
      if (!entry) throw new RunServiceError('unknown-run', `No run “${runId}” in this session.`)
      const lastEvent = Date.parse(entry.run.events[entry.run.events.length - 1]!.at)
      try {
        const next = resolveApproval(entry.run, requestId, outcome, { nowMs: Math.max(now(), lastEvent), profile: entry.profile, ...(note ? { note } : {}) })
        store.set(runId, { run: next, profile: entry.profile })
        return clone(next)
      } catch (e) {
        if (e instanceof ApprovalError) {
          const code = e.code === 'unknown-request' ? 'unknown-approval-request' : e.code === 'already-resolved' ? 'already-resolved' : 'conflict'
          throw new RunServiceError(code, e.message)
        }
        throw e
      }
    },

    async getRun(runId) {
      await wait()
      const entry = store.get(runId)
      if (!entry) throw new RunServiceError('unknown-run', `No run “${runId}” in this session.`)
      return clone(entry.run)
    },

    async listRuns() {
      await wait()
      return clone([...store.values()].map((e) => e.run))
    },
  }
  return { tasks, runs }
}
