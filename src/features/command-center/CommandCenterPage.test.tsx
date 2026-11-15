import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('Command Center', () => {
  it('shows all four scenarios with both conditions', async () => {
    renderHome()
    await screen.findByRole('heading', { level: 1, name: 'Command Center' })
    for (const id of ['FIN-01', 'FIN-02', 'HLT-01', 'HLT-02']) {
      const card = (await screen.findAllByText(id)).map((e) => e.closest('[data-scenario]')).find(Boolean) as HTMLElement
      expect(card).toBeTruthy()
      expect(within(card).getByRole('list', { name: `${id} outcomes` })).toBeInTheDocument()
    }
  })

  it('derives the headline comparison from run records', async () => {
    renderHome()
    expect(await screen.findByText('2 of 2 out-of-scope actions ran.')).toBeInTheDocument()
    expect(screen.getByText('2 of 2 out-of-scope actions were blocked before running.')).toBeInTheDocument()
  })

  it('labels the data as simulated and shows both agents', async () => {
    renderHome()
    await screen.findByRole('heading', { name: 'Agents' })
    expect(screen.getByRole('note')).toHaveTextContent(/demonstration data/i)
    expect(document.querySelectorAll('[data-agent]')).toHaveLength(2)
  })

  it('has no pending placeholder links to future modules', async () => {
    renderHome()
    await screen.findByRole('heading', { level: 1, name: 'Command Center' })
    expect(screen.queryByRole('link', { name: /walkthrough/i })).not.toBeInTheDocument()
  })
})

describe('Command Center when the source fails', () => {
  it('shows an error with retry and no mock data', async () => {
    vi.resetModules()
    vi.doMock('@/services', async () => {
      const real = (await vi.importActual('@/services')) as { services: Record<string, unknown> }
      const fail = () => Promise.reject(new Error("The AegisAI backend isn't available."))
      return {
        ...real,
        services: { ...real.services, agents: { listAgents: fail, listPrincipals: fail } },
      }
    })
    const { CommandCenterPage } = await import('./CommandCenterPage')
    const { AppProviders: Providers } = await import('@/app/providers')
    render(
      <Providers>
        <CommandCenterPage />
      </Providers>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't available/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('FIN-01')).not.toBeInTheDocument()
    vi.doUnmock('@/services')
  })
})
