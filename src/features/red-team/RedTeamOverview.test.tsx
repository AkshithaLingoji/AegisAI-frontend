import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { routes } from '@/app/routes'
import { NotConnectedError, services } from '@/services'
import { CategoryList } from './components/CategoryList'
import { ConnectionBadge } from './components/ConnectionPanel'
import { LabSections } from './components/LabSections'
import { LAB_SECTIONS } from './data/labSections'
import { PLANNED_CATEGORIES, categoryLabel } from './data/plannedCategories'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => queryClient.clear())
afterEach(() => vi.restoreAllMocks())

describe('navigation and route', () => {
  it('has a Red-Team Lab sidebar link that opens the overview', async () => {
    const router = renderAt('/')
    const nav = (await screen.findAllByRole('navigation', { name: 'Primary' }))[0]!
    await userEvent.click(within(nav).getByRole('link', { name: 'Red-Team Lab' }))
    expect(router.state.location.pathname).toBe('/red-team')
    expect(await screen.findByRole('heading', { level: 1, name: 'Red-Team Lab' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Red-Team Lab' })).toHaveAttribute('aria-current', 'page')
  })

  it('leaves the other modules reachable', async () => {
    renderAt('/red-team')
    const nav = (await screen.findAllByRole('navigation', { name: 'Primary' }))[0]!
    for (const name of ['Command Center', 'Guided Tasks', 'Agent Operations', 'Design system']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
  })
})

describe('overview in mock mode', () => {
  it('explains the purpose, the separate subsystem and the categories', async () => {
    renderAt('/red-team')
    expect(await screen.findByRole('heading', { level: 2, name: 'What it is for' })).toBeInTheDocument()
    expect(screen.getByText(/Adversarial testing is needed/)).toBeInTheDocument()
    expect(document.querySelector('[data-separate-subsystem]')).toHaveTextContent(/separate experimental testing subsystem/)
    const list = screen.getByRole('list', { name: 'Attack categories' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(PLANNED_CATEGORIES.length)
    expect(within(list).getByText('Prompt injection')).toBeInTheDocument()
    expect(within(list).getByText('Execution and reliability attacks')).toBeInTheDocument()
  })

  it('says it is a mock, shows honest empty states and no fabricated statistics', async () => {
    renderAt('/red-team')
    const panel = await screen.findByText('MOCK / DEVELOPMENT', { selector: '[data-connection-state] *' })
    expect(panel).toBeInTheDocument()
    expect(screen.queryByText('CONNECTED BACKEND')).not.toBeInTheDocument()
    expect(await screen.findByText(/illustrative demonstration entries are loaded.*not the Red-Team library/)).toBeInTheDocument()
    expect(await screen.findByText(/No executions yet. Nothing has been run/)).toBeInTheDocument()
    const main = document.querySelector('main') as HTMLElement
    expect(main.textContent).not.toMatch(/\d+\s*(%|passed|blocked|successful|attacks? (blocked|detected))/i)
  })

  it('lists the lab sections: Overview, the Catalogue and Configuration are linked, the rest are upcoming and not links', async () => {
    renderAt('/red-team')
    const sections = await screen.findByRole('list', { name: 'Red-Team Lab sections' })
    const items = within(sections).getAllByRole('listitem')
    expect(items.map((i) => i.getAttribute('data-lab-section'))).toEqual(['overview', 'catalogue', 'configuration', 'execution', 'results', 'evidence', 'reports'])
    expect(items.filter((i) => i.getAttribute('data-status') === 'available').map((i) => i.getAttribute('data-lab-section'))).toEqual(['overview', 'catalogue', 'configuration'])
    expect(within(sections).getAllByText('Upcoming')).toHaveLength(4)
    expect(within(sections).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/red-team', '/red-team/scenarios', '/red-team/configure'])
    expect(within(sections).queryAllByRole('button')).toHaveLength(0)
    for (const i of items.filter((x) => x.getAttribute('data-status') === 'upcoming')) expect(within(i).queryAllByRole('link')).toHaveLength(0)
  })

  it('shows a loading state first', async () => {
    renderAt('/red-team')
    expect(screen.getByText('Checking the Red-Team subsystem…')).toBeInTheDocument()
    await screen.findByText(/No executions yet/)
  })
})

describe('overview when the backend is selected but not connected', () => {
  it('shows BACKEND NOT CONNECTED, the failure, and no demonstration data', async () => {
    const nc = new NotConnectedError('The backend adapter for Red-Team scenarios is not implemented yet.')
    vi.spyOn(services.redTeam, 'getConnectionStatus').mockResolvedValue({ state: 'not_connected', source: 'backend', detail: 'The Red-Team backend adapter is not implemented yet. Nothing is being served, and the app does not substitute mock data.' })
    vi.spyOn(services.redTeam, 'listScenarios').mockRejectedValue(nc)
    vi.spyOn(services.redTeam, 'listExecutions').mockRejectedValue(nc)
    renderAt('/red-team')
    expect(await screen.findByText('BACKEND NOT CONNECTED')).toBeInTheDocument()
    expect(screen.queryByText('CONNECTED BACKEND')).not.toBeInTheDocument()
    expect(screen.queryByText('MOCK / DEVELOPMENT', { selector: '[data-connection-state] *' })).not.toBeInTheDocument()
    expect(await screen.findAllByText(/Unavailable\./)).toHaveLength(2)
    expect(screen.queryByText(/illustrative/i)).not.toBeInTheDocument()
    expect(screen.getByText(/does not substitute mock data/)).toBeInTheDocument()
  })

  it('shows an error panel if the status itself cannot be read', async () => {
    vi.spyOn(services.redTeam, 'getConnectionStatus').mockRejectedValue(new Error('boom'))
    renderAt('/red-team')
    expect(await screen.findByText("The connection status couldn't be read")).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('shows an empty scenario library plainly', async () => {
    vi.spyOn(services.redTeam, 'listScenarios').mockResolvedValue([])
    renderAt('/red-team')
    expect(await screen.findByText('The source returned no scenarios.')).toBeInTheDocument()
  })
})

describe('presentation components are data-driven', () => {
  it('says CONNECTED BACKEND only for a connected status', () => {
    const states = ['mock', 'connected', 'not_connected', 'unreachable'] as const
    const text = states.map((state) => {
      const { container, unmount } = render(<ConnectionBadge status={{ state, source: 'backend', detail: '' }} />)
      const t = container.textContent
      unmount()
      return t
    })
    expect(text).toEqual(['MOCK / DEVELOPMENT', 'CONNECTED BACKEND', 'BACKEND NOT CONNECTED', 'BACKEND UNREACHABLE'])
  })

  it('renders any number of categories without per-category components', () => {
    render(<CategoryList categories={[...PLANNED_CATEGORIES, { id: 'brand_new', label: 'Brand new category', description: 'Added as data only.' }]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(PLANNED_CATEGORIES.length + 1)
    expect(screen.getByText('Brand new category')).toBeInTheDocument()
  })

  it('shows unknown category ids verbatim instead of guessing a label', () => {
    expect(categoryLabel('prompt_injection')).toBe('Prompt injection')
    expect(categoryLabel('something_new')).toBe('something_new')
  })

  it('links only available sections and never an upcoming one', () => {
    render(
      <MemoryRouter>
        <LabSections sections={LAB_SECTIONS} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(LAB_SECTIONS.filter((s) => s.status === 'available').length)
    expect(LAB_SECTIONS.filter((s) => s.status === 'upcoming').every((s) => !s.to)).toBe(true)
  })
})
