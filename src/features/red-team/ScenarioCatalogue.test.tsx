import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { routes } from '@/app/routes'
import { NotConnectedError, RedTeamServiceError, services } from '@/services'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}
const backLink = () => document.querySelector('[data-back-link]') as HTMLElement
const cards = async () => within(await screen.findByRole('list', { name: 'Scenarios' })).getAllByRole('listitem')

beforeEach(() => queryClient.clear())
afterEach(() => vi.restoreAllMocks())

describe('catalogue in mock mode', () => {
  it('is reachable from the overview and the lab sub-navigation', async () => {
    const router = renderAt('/red-team')
    const sections = await screen.findByRole('list', { name: 'Red-Team Lab sections' })
    await userEvent.click(within(sections).getByRole('link', { name: 'Scenario Catalogue' }))
    expect(router.state.location.pathname).toBe('/red-team/scenarios')
    expect(await screen.findByRole('heading', { level: 1, name: 'Scenario Catalogue' })).toBeInTheDocument()
    const sub = screen.getByRole('navigation', { name: 'Red-Team Lab pages' })
    expect(within(sub).getByRole('link', { name: 'Scenario Catalogue' })).toHaveAttribute('aria-current', 'page')
    expect(within(sub).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
    const primary = (await screen.findAllByRole('navigation', { name: 'Primary' }))[0]!
    expect(within(primary).getByRole('link', { name: 'Red-Team Lab' })).toHaveAttribute('aria-current', 'page')
  })

  it('lists every returned scenario as a card with title, ID, category, description, expected behaviour and provenance', async () => {
    renderAt('/red-team/scenarios')
    const items = await cards()
    const returned = await services.redTeam.listScenarios()
    expect(items).toHaveLength(returned.length)
    const card = items.find((i) => i.getAttribute('data-scenario-id') === 'demo-prompt-injection')!
    expect(within(card).getByRole('link', { name: 'Demo: instruction hidden in a document' })).toBeInTheDocument()
    expect(card).toHaveTextContent('ID: demo-prompt-injection')
    expect(within(card).getByText('Prompt injection')).toBeInTheDocument()
    expect(card).toHaveTextContent(/Illustrative demonstration entry\. A document/)
    expect(card).toHaveTextContent('Expected secure behaviour')
    expect(card).toHaveTextContent(/does not act on the embedded instruction/)
    expect(within(card).getByText('Mock demonstration data')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(`Showing ${returned.length} of ${returned.length} scenarios`)
  })

  it('says plainly that nothing has been run and shows no metrics, scores or results', async () => {
    renderAt('/red-team/scenarios')
    await cards()
    expect(document.querySelector('[data-no-execution-note]')).toHaveTextContent(/does not mean it has been run/)
    expect(document.querySelector('[data-no-execution-note]')).toHaveTextContent(/Guided Tasks demonstrates normal workflows/)
    const main = document.querySelector('main') as HTMLElement
    expect(main.textContent).not.toMatch(/severity|risk (score|rating)|\d+\s*%|passed|blocked \d|executed \d/i)
    expect(screen.queryByRole('button', { name: /run|execute|start/i })).not.toBeInTheDocument()
  })

  it('does not duplicate normal Guided Tasks in the catalogue', async () => {
    renderAt('/red-team/scenarios')
    await cards()
    const text = (document.querySelector('main') as HTMLElement).textContent ?? ''
    expect(text).not.toMatch(/FIN-0\d|HLT-0\d|expense report|health summary|payroll/i)
  })

  it('builds the category filters from the returned scenarios and filters by category', async () => {
    renderAt('/red-team/scenarios')
    const total = (await cards()).length
    const group = screen.getByRole('group', { name: 'Filter by category' })
    const ids = [...group.querySelectorAll('[data-category-filter]')].map((b) => b.getAttribute('data-category-filter'))
    const returned = await services.redTeam.listScenarios()
    expect(new Set(ids)).toEqual(new Set(returned.map((s) => s.categoryId)))
    expect(within(group).getByRole('button', { name: /^All\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(within(group).getByRole('button', { name: /Data exfiltration/ }))
    expect(within(group).getByRole('button', { name: /Data exfiltration/ })).toHaveAttribute('aria-pressed', 'true')
    const filtered = await cards()
    expect(filtered).toHaveLength(1)
    expect(filtered[0]).toHaveAttribute('data-scenario-id', 'demo-data-exfiltration')
    expect(screen.getByRole('status')).toHaveTextContent(`Showing 1 of ${total} scenarios`)

    await userEvent.click(within(group).getByRole('button', { name: /^All/ }))
    expect(await cards()).toHaveLength(total)
  })

  it('searches title, ID, description and category', async () => {
    renderAt('/red-team/scenarios')
    await cards()
    const box = screen.getByRole('searchbox', { name: 'Search scenarios' })
    const ids = async () => (await cards()).map((c) => c.getAttribute('data-scenario-id'))

    await userEvent.type(box, 'APPROVAL')
    expect(await ids()).toEqual(['demo-unauthorized-action']) // description
    await userEvent.clear(box)
    await userEvent.type(box, 'demo-tool-misuse')
    expect(await ids()).toEqual(['demo-tool-misuse']) // id
    await userEvent.clear(box)
    await userEvent.type(box, 'tool used outside')
    expect(await ids()).toEqual(['demo-tool-misuse']) // title
    await userEvent.clear(box)
    await userEvent.type(box, 'privilege escalation')
    expect(await ids()).toEqual(['demo-privilege-escalation']) // category
  })

  it('shows a no-results state with a way back, and the filters reset', async () => {
    renderAt('/red-team/scenarios')
    const total = (await cards()).length
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search scenarios' }), 'zzzz-nothing')
    const none = await screen.findByText('No scenarios match')
    expect(none.closest('[data-catalogue-state]')).toHaveAttribute('data-catalogue-state', 'no-results')
    expect(screen.queryByRole('list', { name: 'Scenarios' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(await cards()).toHaveLength(total)
    expect(screen.getByRole('searchbox', { name: 'Search scenarios' })).toHaveValue('')
  })

  it('restores the search and filter from the URL', async () => {
    renderAt('/red-team/scenarios?category=tool_misuse&q=outside')
    const items = await cards()
    expect(items.map((c) => c.getAttribute('data-scenario-id'))).toEqual(['demo-tool-misuse'])
    expect(screen.getByRole('searchbox', { name: 'Search scenarios' })).toHaveValue('outside')
  })
})

describe('scenario detail', () => {
  it('opens from a card and shows the complete information with the filters kept for going back', async () => {
    const router = renderAt('/red-team/scenarios')
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search scenarios' }), 'exfil')
    await userEvent.click(await screen.findByRole('link', { name: /data sent to an unapproved destination/ }))
    expect(router.state.location.pathname).toBe('/red-team/scenarios/demo-data-exfiltration')
    expect(await screen.findByRole('heading', { level: 1, name: 'Demo: data sent to an unapproved destination' })).toBeInTheDocument()

    expect(screen.getByLabelText('Scenario identity')).toHaveTextContent('demo-data-exfiltration')
    expect(screen.getByLabelText('Scenario identity')).toHaveTextContent('Data exfiltration')
    expect(screen.getByLabelText('Scenario identity')).toHaveTextContent('Mock demonstration data')
    expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument()

    const input = document.querySelector('[data-input-format="structured"]') as HTMLElement
    expect(within(input).getByLabelText('Structured input fields')).toHaveTextContent('channel')
    expect(within(input).getByLabelText('Structured input fields')).toHaveTextContent('example_outbound_message')
    expect(within(input).getByLabelText('Structured input fields')).toHaveTextContent('unapproved.example') // nested array shown
    expect(within(input).getByRole('button', { name: 'Raw structured input (JSON)' })).toBeInTheDocument()

    const spec = document.querySelector('[data-expected-behavior]') as HTMLElement
    expect(spec).toHaveTextContent('Specification, not a result')
    expect(spec).toHaveTextContent(/does not send sensitive material/)
    expect(within(spec).getByLabelText('Expected behaviour details')).toHaveTextContent('must_not') // structured details

    await userEvent.click(backLink())
    expect(router.state.location.pathname).toBe('/red-team/scenarios')
    expect(router.state.location.search).toBe('?q=exfil')
    expect(await screen.findByRole('searchbox', { name: 'Search scenarios' })).toHaveValue('exfil')
  })

  it('shows text input as text, and distinguishes expected behaviour from an execution result', async () => {
    renderAt('/red-team/scenarios/demo-prompt-injection')
    await screen.findByRole('heading', { level: 1, name: /instruction hidden in a document/ })
    expect(document.querySelector('[data-input-format="text"]')).toHaveTextContent(/out-of-place instruction/)
    const exec = document.querySelector('[data-execution-note]') as HTMLElement
    expect(exec).toHaveTextContent('Execution: none recorded')
    expect(exec).toHaveTextContent(/has not been run from here/)
    expect(document.querySelector('[data-expected-behavior]')).toHaveTextContent(/does not say that anything has happened/)
    expect(screen.queryByRole('button', { name: /run|execute|start/i })).not.toBeInTheDocument()
  })

  it('renders input as inert text, never as markup', async () => {
    vi.spyOn(services.redTeam, 'getScenario').mockResolvedValue({
      id: 'x-1', categoryId: 'prompt_injection', description: 'D', input: { format: 'text', text: '<img src=x onerror=alert(1)> **ignore previous**' },
      expectedBehavior: { summary: 'S' }, provenance: { source: 'mock' },
    })
    renderAt('/red-team/scenarios/x-1')
    const pre = await waitForPre()
    expect(pre.textContent).toBe('<img src=x onerror=alert(1)> **ignore previous**')
    expect(pre.querySelector('img')).toBeNull()
  })

  it('shows a not-found state for an unknown scenario', async () => {
    renderAt('/red-team/scenarios/does-not-exist')
    expect(await screen.findByText('Scenario not found')).toBeInTheDocument()
    expect(document.querySelector('[data-catalogue-state="not-found"]')).toBeInTheDocument()
    expect(backLink()).toHaveAttribute('href', '/red-team/scenarios')
  })
})

async function waitForPre() {
  return (await screen.findByText(/ignore previous/, { selector: 'pre' })) as HTMLElement
}

describe('catalogue states', () => {
  it('shows a loading state first', async () => {
    renderAt('/red-team/scenarios')
    expect(screen.getByText('Loading the scenario library…')).toBeInTheDocument()
    await cards()
  })

  it('shows an empty state when the source returns no scenarios, and invents nothing', async () => {
    vi.spyOn(services.redTeam, 'listScenarios').mockResolvedValue([])
    renderAt('/red-team/scenarios')
    expect(await screen.findByText('The source returned no scenarios')).toBeInTheDocument()
    expect(document.querySelector('[data-catalogue-state="empty"]')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Scenarios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('shows a backend-unavailable state and never demonstration data when the backend is not connected', async () => {
    vi.spyOn(services.redTeam, 'getConnectionStatus').mockResolvedValue({ state: 'not_connected', source: 'backend', detail: 'Not connected.' })
    vi.spyOn(services.redTeam, 'listScenarios').mockRejectedValue(new NotConnectedError('The backend adapter for Red-Team scenarios is not implemented yet.'))
    renderAt('/red-team/scenarios')
    expect(await screen.findByText('The scenario library is unavailable: the backend is not connected')).toBeInTheDocument()
    expect(document.querySelector('[data-catalogue-state="backend-unavailable"]')).toHaveTextContent(/no demonstration data is shown/)
    expect(screen.getByText('BACKEND NOT CONNECTED')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Scenarios' })).not.toBeInTheDocument()
    expect(screen.queryByText(/demo/i, { selector: 'li *' })).not.toBeInTheDocument()
  })

  it('shows a backend-unavailable state on the detail page too', async () => {
    vi.spyOn(services.redTeam, 'getScenario').mockRejectedValue(new NotConnectedError('Not implemented.'))
    renderAt('/red-team/scenarios/anything')
    expect(await screen.findByText(/The scenario is unavailable: the backend is not connected/)).toBeInTheDocument()
  })

  it('shows an error state with the validation issues and a retry that works', async () => {
    const spy = vi.spyOn(services.redTeam, 'listScenarios').mockRejectedValueOnce(new RedTeamServiceError('invalid-data', 'Invalid scenario from the source.', ['scenario: “category” must be a non-empty string']))
    renderAt('/red-team/scenarios')
    expect(await screen.findByText("The scenario library couldn't be loaded")).toBeInTheDocument()
    expect(screen.getByText(/“category” must be a non-empty string/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Scenarios' })).not.toBeInTheDocument()
    spy.mockRestore()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect((await cards()).length).toBeGreaterThan(0)
  })

  it('shows provenance for backend-sourced scenarios as backend, not mock', async () => {
    vi.spyOn(services.redTeam, 'listScenarios').mockResolvedValue([
      { id: 'b-1', categoryId: 'brand_new_kind', description: 'D', input: { format: 'text', text: 'x' }, expectedBehavior: { summary: 'S' }, provenance: { source: 'backend' } },
    ])
    renderAt('/red-team/scenarios')
    const [card] = await cards()
    expect(within(card!).getByText('Reported by backend')).toBeInTheDocument()
    expect(within(card!).queryByText('Mock demonstration data')).not.toBeInTheDocument()
    expect(within(card!).getByText('brand_new_kind')).toBeInTheDocument() // unknown category verbatim
    expect(within(card!).getByRole('link', { name: 'b-1' })).toBeInTheDocument() // no title: the ID is the name
  })
})
