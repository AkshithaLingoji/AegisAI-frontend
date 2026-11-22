import type { RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AgentDetailPage } from '@/features/agent-operations/AgentDetailPage'
import { AgentOperationsPage } from '@/features/agent-operations/AgentOperationsPage'
import { CommandCenterPage } from '@/features/command-center/CommandCenterPage'
import { RedTeamLayout } from '@/features/red-team/RedTeamLayout'
import { RedTeamOverviewPage } from '@/features/red-team/RedTeamOverviewPage'
import { ScenarioCataloguePage } from '@/features/red-team/ScenarioCataloguePage'
import { ScenarioDetailPage } from '@/features/red-team/ScenarioDetailPage'
import { GuidedTasksPage } from '@/features/guided-tasks/GuidedTasksPage'
import { DesignSystemPage } from '@/features/foundation/DesignSystemPage'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CommandCenterPage /> },
      { path: 'tasks', element: <GuidedTasksPage /> },
      {
        path: 'red-team',
        element: <RedTeamLayout />,
        children: [
          { index: true, element: <RedTeamOverviewPage /> },
          { path: 'scenarios', element: <ScenarioCataloguePage /> },
          { path: 'scenarios/:scenarioId', element: <ScenarioDetailPage /> },
        ],
      },
      { path: 'agents', element: <AgentOperationsPage /> },
      { path: 'agents/:agentId', element: <AgentDetailPage /> },
      { path: 'design-system', element: <DesignSystemPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
