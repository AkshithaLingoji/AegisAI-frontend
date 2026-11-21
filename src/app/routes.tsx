import type { RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AgentDetailPage } from '@/features/agent-operations/AgentDetailPage'
import { AgentOperationsPage } from '@/features/agent-operations/AgentOperationsPage'
import { CommandCenterPage } from '@/features/command-center/CommandCenterPage'
import { GuidedTasksPage } from '@/features/guided-tasks/GuidedTasksPage'
import { DesignSystemPage } from '@/features/foundation/DesignSystemPage'
import { NotFoundPage } from './NotFoundPage'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <CommandCenterPage /> },
      { path: 'tasks', element: <GuidedTasksPage /> },
      { path: 'agents', element: <AgentOperationsPage /> },
      { path: 'agents/:agentId', element: <AgentDetailPage /> },
      { path: 'design-system', element: <DesignSystemPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
