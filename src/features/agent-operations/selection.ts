import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AgentWorkspace, Condition, RunView, TaskView } from './model'

export interface RunSelection {
  task?: TaskView
  run?: RunView
  condition: Condition
}

/**
 * Which task and condition are being inspected. Kept in the URL (?task=…&condition=…) so a
 * view can be linked to, and falls back to the first task's Baseline run.
 */
export function useRunSelection(workspace: AgentWorkspace) {
  const [params, setParams] = useSearchParams()
  const tasks = workspace.previousTasks

  const selection = useMemo<RunSelection>(() => {
    const task = tasks.find((t) => t.scenario.id === params.get('task')) ?? tasks[0]
    const wanted = params.get('condition') === 'protected' ? 'protected' : 'baseline'
    const run = task?.runs.find((r) => r.condition === wanted) ?? task?.runs[0]
    return { task, run, condition: (run?.condition ?? wanted) as Condition }
  }, [params, tasks])

  const select = useCallback(
    (taskId: string, condition: Condition) => {
      setParams({ task: taskId, condition }, { replace: true, preventScrollReset: true })
    },
    [setParams],
  )

  return { selection, select }
}
