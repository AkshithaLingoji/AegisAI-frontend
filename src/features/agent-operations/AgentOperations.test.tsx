import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('Agent Operations overview', () => {
  it('shows both agents as distinct cards labelled as mock data', async () => {
    renderAt('/agents')
    await screen.findByRole('heading', { level: 1, name: 'Agents' })
    const fin = await screen.findByRole('heading', { level: 2, name: 'Finance Agent' })
    const hlt = screen.getByRole('heading', { level: 2, name: 'Health Administration Agent' })
    const finCard = fin.closest('[data-agent-card]') as HTMLElement
    const hltCard = hlt.closest('[data-agent-card]') as HTMLElement
    expect(finCard).not.toBe(hltCard)
    for (const card of [finCard, hltCard]) {
      expect(within(card).getByText('MOCK / DEVELOPMENT')).toBeInTheDocument()
      expect(within(card).getByText('Simulated status: Idle')).toBeInTheDocument()
      expect(within(card).getByText(/Synthetic .* environment/)).toBeInTheDocument()
    }
    expect(within(finCard).getByText(/1 restricted resource.*Payroll table/)).toBeInTheDocument()
    expect(within(finCard).getByText('Q3 budgets')).toBeInTheDocument()
    expect(within(hltCard).getByText('Appointment schedule')).toBeInTheDocument()
  })

  it('opens an agent workspace and returns to the overview', async () => {
    const router = renderAt('/agents')
    await userEvent.click(await screen.findByRole('link', { name: 'Open Finance Agent workspace' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Finance Agent' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/agents/agent-finance')
    await userEvent.click(screen.getByRole('link', { name: /all agents/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Agents' })).toBeInTheDocument()
  })
})

describe('Finance Agent workspace', () => {
  it('separates permitted from restricted resources and flags unused tools', async () => {
    renderAt('/agents/agent-finance')
    await screen.findByRole('heading', { level: 1, name: 'Finance Agent' })
    const permitted = document.querySelector('[data-resource-group="permitted"]') as HTMLElement
    const restricted = document.querySelector('[data-resource-group="restricted"]') as HTMLElement
    expect(within(permitted).getByText('Q3 expense ledger')).toBeInTheDocument()
    expect(within(permitted).getByText('Q3 budgets')).toBeInTheDocument()
    expect(within(permitted).queryByText('Payroll table')).not.toBeInTheDocument()
    expect(within(restricted).getByText('Payroll table')).toBeInTheDocument()
    const txn = document.querySelector('[data-tool="tool-fin-transaction"]') as HTMLElement
    expect(within(txn).getByText('Not used in any recorded run.')).toBeInTheDocument()
    expect(within(txn).getByText(/Not on the user’s list: transact/)).toBeInTheDocument()
    const exp = document.querySelector('[data-tool="tool-fin-export"]') as HTMLElement
    expect(within(exp).getByText(/audit-drop@example.invalid \(simulated\)/)).toBeInTheDocument()
  })

  it('reveals technical identity and raw permissions on demand', async () => {
    renderAt('/agents/agent-finance')
    await screen.findByRole('heading', { level: 1, name: 'Finance Agent' })
    expect(screen.queryByText('user-finance-analyst')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Technical identity' }))
    expect(await screen.findByText('user-finance-analyst')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Raw permission data' }))
    expect(await screen.findByText(/fin-budgets-q3/)).toBeInTheDocument()
  })

  it('has no current task and lists previous tasks', async () => {
    renderAt('/agents/agent-finance')
    expect(await screen.findByText('Nothing is running')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-task]')).toHaveLength(2)
  })

  it('inspects a run: Baseline executes the export, Protected blocks it', async () => {
    const router = renderAt('/agents/agent-finance')
    await screen.findByRole('heading', { level: 1, name: 'Finance Agent' })

    await userEvent.click(screen.getByRole('button', { name: 'Inspect Baseline run of FIN-02' }))
    expect(router.state.location.search).toBe('?task=FIN-02&condition=baseline')
    let exportCard = (await screen.findByText('Export the payroll table to an external address', { selector: 'p' })).closest('[data-proposal]') as HTMLElement
    expect(exportCard).toHaveAttribute('data-outcome', 'executed')
    expect(within(exportCard).getByText('Ran (out of scope)')).toBeInTheDocument()
    expect(within(exportCard).getByText('Not checked')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Protected run' }))
    exportCard = (await screen.findByText('Export the payroll table to an external address', { selector: 'p' })).closest('[data-proposal]') as HTMLElement
    expect(exportCard).toHaveAttribute('data-outcome', 'blocked')
    expect(within(exportCard).getByText('Denied')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Protected run' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(exportCard).getByRole('button', { name: 'Inspect this action' }))
    expect(await within(exportCard).findByText(/OUT_OF_SCOPE_RESOURCE/)).toBeVisible()
  })

  it('expands the execution timeline', async () => {
    renderAt('/agents/agent-finance?task=FIN-02&condition=baseline')
    await userEvent.click(await screen.findByRole('button', { name: /Execution timeline/ }))
    expect(await screen.findByText(/NOTE TO ASSISTANT/)).toBeInTheDocument()
  })

  it('shows audit events needing attention and all records on demand', async () => {
    renderAt('/agents/agent-finance')
    await screen.findByRole('heading', { level: 1, name: 'Finance Agent' })
    const attention = screen.getByRole('list', { name: 'Audit events needing attention' })
    expect(within(attention).getAllByRole('listitem')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: /All 14 audit records/ }))
    expect(await screen.findByRole('list', { name: 'All audit records' })).toBeInTheDocument()
  })
})

describe('Health Administration Agent workspace', () => {
  it('distinguishes authorized from restricted records', async () => {
    renderAt('/agents/agent-health')
    await screen.findByRole('heading', { level: 1, name: 'Health Administration Agent' })
    const ok = document.querySelector('[data-resource-group="permitted"]') as HTMLElement
    const no = document.querySelector('[data-resource-group="restricted"]') as HTMLElement
    expect(within(ok).getByRole('heading', { name: /Authorized records/ })).toBeInTheDocument()
    expect(within(ok).getByText('Patient A record')).toBeInTheDocument()
    expect(within(ok).getByText('Appointment schedule')).toBeInTheDocument()
    expect(within(no).getByRole('heading', { name: /Restricted records/ })).toBeInTheDocument()
    expect(within(no).getByText('Patient B record')).toBeInTheDocument()
    expect(screen.getByText('Generate visit report')).toBeInTheDocument()
  })
})

describe('access status vs data classification', () => {
  it.each(['agent-finance', 'agent-health'])('never contradicts itself on %s', async (id) => {
    renderAt(`/agents/${id}`)
    await screen.findByText('Synthetic resources')
    const ok = document.querySelector('[data-resource-group="permitted"]') as HTMLElement
    const no = document.querySelector('[data-resource-group="restricted"]') as HTMLElement
    for (const card of ok.querySelectorAll<HTMLElement>('[data-resource]')) {
      expect(within(card).getByText('Access: Authorized')).toBeInTheDocument()
      expect(within(card).queryByText('Access: Restricted')).not.toBeInTheDocument()
    }
    for (const card of no.querySelectorAll<HTMLElement>('[data-resource]')) {
      expect(within(card).getByText('Access: Restricted')).toBeInTheDocument()
      expect(within(card).queryByText('Access: Authorized')).not.toBeInTheDocument()
    }
    // Every classification label is prefixed, so no bare "Restricted" badge can read as an access status.
    expect(screen.queryByText(/^(public|internal|confidential|restricted)$/i)).not.toBeInTheDocument()
  })

  it('shows an authorized record with its classification as a separate label', async () => {
    renderAt('/agents/agent-health')
    await screen.findByText('Synthetic resources')
    const a = document.querySelector('[data-resource="hlt-patient-a"]') as HTMLElement
    expect(within(a).getByText('Access: Authorized')).toBeInTheDocument()
    expect(within(a).getByText('Classification: Restricted')).toBeInTheDocument()
    const summary = document.querySelector('[data-resource="hlt-visit-summary-a"]') as HTMLElement
    expect(within(summary).getByText('Classification: Confidential')).toBeInTheDocument()
    const b = document.querySelector('[data-resource="hlt-patient-b"]') as HTMLElement
    expect(within(b).getByText('Access: Restricted')).toBeInTheDocument()
  })
})

describe('states', () => {
  it('shows a not-found state for an unknown agent', async () => {
    renderAt('/agents/nope')
    expect(await screen.findByText('Agent not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all agents/i })).toBeInTheDocument()
  })

  it('shows an error with retry and no mock data when the source fails', async () => {
    vi.resetModules()
    vi.doMock('@/services', async () => {
      const real = (await vi.importActual('@/services')) as { services: Record<string, unknown> }
      const fail = () => Promise.reject(new Error("The AegisAI backend isn't available."))
      return { ...real, services: { ...real.services, agents: { listAgents: fail, listPrincipals: fail, listTools: fail } } }
    })
    const { AgentOperationsPage } = await import('./AgentOperationsPage')
    const { AppProviders: Providers } = await import('@/app/providers')
    render(
      <Providers>
        <AgentOperationsPage />
      </Providers>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't available/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('Finance Agent')).not.toBeInTheDocument()
    vi.doUnmock('@/services')
  })

  it('shows a loading state while the source has not answered', async () => {
    vi.resetModules()
    vi.doMock('@/services', async () => {
      const real = (await vi.importActual('@/services')) as { services: Record<string, unknown> }
      const never = () => new Promise<never>(() => {})
      return { ...real, services: { ...real.services, agents: { listAgents: never, listPrincipals: never, listTools: never } } }
    })
    const { AgentOperationsPage } = await import('./AgentOperationsPage')
    const { AppProviders: Providers } = await import('@/app/providers')
    render(
      <Providers>
        <AgentOperationsPage />
      </Providers>,
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Loading the agents')
    vi.doUnmock('@/services')
  })
})
