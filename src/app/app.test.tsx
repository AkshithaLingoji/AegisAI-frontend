import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppProviders } from './providers'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

describe('app shell', () => {
  it('lands on the Command Center and shows the mock source + banner', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Command Center' })).toBeInTheDocument()
    expect(await screen.findAllByText('MOCK / DEVELOPMENT')).not.toHaveLength(0)
    expect(screen.getByRole('note')).toHaveTextContent(/demonstration data/i)
  })

  it('lists only real modules as links; planned modules are not navigable', async () => {
    renderAt('/design-system')
    const nav = (await screen.findAllByRole('navigation', { name: 'Primary' }))[0]!
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Command Center', 'Guided Tasks', 'Agent Operations', 'Red-Team Lab', 'Design system'])
    const planned = within(nav).getByText('Assurance & Policy').closest('li')!
    expect(planned).toHaveAttribute('aria-disabled', 'true')
    expect(within(nav).queryByRole('link', { name: /assurance/i })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Red-Team Lab' })).toHaveAttribute('href', '/red-team')
  })

  it('shows a friendly page for unknown routes', async () => {
    renderAt('/nope')
    expect(await screen.findByText(/this page doesn't exist/i)).toBeInTheDocument()
  })

  it('exposes a skip link and a labelled mobile-menu button', async () => {
    renderAt('/design-system')
    expect(await screen.findByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('button', { name: /open navigation/i })).toBeInTheDocument()
  })

  it('opens the navigation drawer from the menu button', async () => {
    renderAt('/design-system')
    await userEvent.click(await screen.findByRole('button', { name: /open navigation/i }))
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
  })
})

describe('guided workspace sample', () => {
  it('walks through the stages, with back and revisit support', async () => {
    renderAt('/design-system')
    await screen.findByRole('heading', { name: 'Guided workspace pattern' })

    expect(await screen.findByRole('heading', { name: 'The request' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'What the agent wants to do' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'The request' })).toBeInTheDocument()
  })
})
