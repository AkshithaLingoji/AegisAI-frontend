import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { routes } from '@/app/routes'
import { NotConnectedError, services } from '@/services'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}
const FULL = 'scenario=demo-data-exfiltration&agent=agent-finance&resource=fin-expenses-q3&resource=fin-payroll'
const review = async (qs: string) => {
  renderAt(`/red-team/review?${qs}`)
  await screen.findByRole('heading', { level: 2, name: 'Configuration summary' })
}
const configure = async (qs = 'scenario=demo-data-exfiltration') => {
  const r = renderAt(`/red-team/configure${qs ? `?${qs}` : ''}`)
  await screen.findByRole('heading', { level: 2, name: '2. Target agent' })
  return r
}

beforeEach(() => queryClient.clear())
afterEach(() => vi.restoreAllMocks())

describe('workflow navigation', () => {
  it('goes Catalogue → Details → Configure → Review and back, keeping the scenario', async () => {
    const router = renderAt('/red-team/scenarios')
    await userEvent.click(await screen.findByRole('link', { name: /data sent to an unapproved destination/ }))
    await screen.findByRole('heading', { level: 1, name: /data sent to an unapproved destination/ })
    await userEvent.click(screen.getByRole('link', { name: 'Configure experiment' }))
    expect(router.state.location.pathname).toBe('/red-team/configure')
    expect(router.state.location.search).toBe('?scenario=demo-data-exfiltration')
    await screen.findByRole('heading', { level: 1, name: 'Configure experiment' })
    expect(await screen.findByLabelText('Scenario from the catalogue')).toHaveValue('demo-data-exfiltration')
    expect(document.querySelector('[data-selected-scenario="demo-data-exfiltration"]')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Finance Agent/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Q3 expense ledger/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    expect(router.state.location.pathname).toBe('/red-team/review')
    await screen.findByRole('heading', { level: 1, name: 'Review configuration' })

    await userEvent.click(screen.getAllByRole('link', { name: 'Edit configuration' })[0]!)
    expect(router.state.location.pathname).toBe('/red-team/configure')
    expect(await screen.findByRole('radio', { name: /Finance Agent/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Q3 expense ledger/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Paired Comparison/ })).toBeChecked()
  })

  it('shows the four steps, marks the current one and links the earlier ones', async () => {
    await configure()
    const steps = screen.getByRole('navigation', { name: 'Experiment steps' })
    expect(within(steps).getAllByRole('listitem').map((i) => i.getAttribute('data-step'))).toEqual(['catalogue', 'details', 'configure', 'review'])
    expect(within(steps).getByText('Configure experiment')).toHaveAttribute('aria-current', 'step')
    expect(within(steps).getByRole('link', { name: 'Scenario Catalogue' })).toHaveAttribute('href', '/red-team/scenarios')
    expect(within(steps).getByRole('link', { name: 'Scenario details' })).toHaveAttribute('href', '/red-team/scenarios/demo-data-exfiltration')
    expect(within(steps).queryByRole('link', { name: 'Review configuration' })).not.toBeInTheDocument()
  })

  it('is reachable from the in-lab navigation and the overview', async () => {
    const router = renderAt('/red-team')
    const sub = await screen.findByRole('navigation', { name: 'Red-Team Lab pages' })
    await userEvent.click(within(sub).getByRole('link', { name: 'Configure Experiment' }))
    expect(router.state.location.pathname).toBe('/red-team/configure')
    await screen.findByRole('heading', { level: 1, name: 'Configure experiment' })
  })

  it('keeps the Configure tab active on the review page', async () => {
    await review(`${FULL}&mode=paired`)
    expect(within(screen.getByRole('navigation', { name: 'Red-Team Lab pages' })).getByRole('link', { name: 'Configure Experiment' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('scenario selection', () => {
  it('lists the catalogue scenarios and switches the selected scenario', async () => {
    await configure('')
    const select = screen.getByLabelText('Scenario from the catalogue')
    const returned = await services.redTeam.listScenarios()
    expect(within(select).getAllByRole('option')).toHaveLength(returned.length + 1)
    expect(select).toHaveValue('')
    expect(document.querySelector('[data-selected-scenario]')).not.toBeInTheDocument()
    await userEvent.selectOptions(select, 'demo-tool-misuse')
    expect(document.querySelector('[data-selected-scenario="demo-tool-misuse"]')).toBeInTheDocument()
    expect(document.querySelector('[data-organisational-risk]')).toHaveTextContent(/legitimate tool used for the wrong purpose/)
  })

  it('says so when the scenario in the URL is not in the catalogue', async () => {
    await configure('scenario=ghost')
    expect(document.querySelector('[data-scenario-missing]')).toHaveTextContent('“ghost” is not in the catalogue')
  })
})

describe('agent selection', () => {
  it('offers the agents the agent service returned, and nothing else', async () => {
    await configure()
    const agents = await services.agents.listAgents()
    const radios = screen.getAllByRole('radio', { name: /Agent/ }).filter((r) => r.getAttribute('name') === 'target-agent')
    expect(radios).toHaveLength(agents.length)
    expect(screen.getByRole('radio', { name: /Finance Agent/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Health Administration Agent/ })).not.toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /Health Administration Agent/ }))
    expect(screen.getByRole('radio', { name: /Health Administration Agent/ })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: /Finance Agent/ }))
    expect(screen.getByRole('radio', { name: /Finance Agent/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Health Administration Agent/ })).not.toBeChecked()
  })
})

describe('resource selection and validation', () => {
  it('lists only returned resources, groups them by the agent’s domain and pre-selects none', async () => {
    await configure()
    const returned = await services.resources.listResources()
    expect(screen.getAllByRole('checkbox')).toHaveLength(returned.length)
    for (const c of screen.getAllByRole('checkbox')) expect(c).not.toBeChecked()
    expect(screen.getByText(/choose an agent to see which resources share its domain/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Finance Agent/ }))
    const same = document.querySelector('[data-resource-group="same"]') as HTMLElement
    expect(same).toHaveTextContent('Same domain as Finance Agent (finance)')
    expect(within(same).getByRole('checkbox', { name: /Payroll table/ })).toBeInTheDocument()
    expect(within(same).queryByRole('checkbox', { name: /Patient A record/ })).not.toBeInTheDocument()
    const other = document.querySelector('[data-resource-group="other"]') as HTMLElement
    expect(within(other).getByRole('checkbox', { name: /Patient A record/ })).toBeInTheDocument()
    expect(screen.getAllByText('Reachable by: Read finance records', { exact: false }).length).toBeGreaterThan(0)
  })

  it('selects and deselects resources and keeps the count', async () => {
    await configure()
    await userEvent.click(screen.getByRole('checkbox', { name: /Q3 budgets/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Payroll table/ }))
    expect(screen.getByText(/2 of 9 selected/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Q3 budgets/ }))
    expect(screen.getByText(/1 of 9 selected/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Payroll table/ })).toBeChecked()
  })

  it('flags restricted resources with text, not colour alone', async () => {
    await configure()
    const card = document.querySelector('[data-resource="fin-payroll"]') as HTMLElement
    expect(within(card).getByText('Restricted')).toBeInTheDocument()
  })

  it('blocks review with a clear list of what is missing, then allows it once complete', async () => {
    const router = await configure()
    await userEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('not complete yet')
    expect(within(alert).getByText(/Choose the target agent/)).toBeInTheDocument()
    expect(within(alert).getByText(/at least one synthetic resource/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/red-team/configure')

    await userEvent.click(screen.getByRole('radio', { name: /Finance Agent/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Q3 expense ledger/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    expect(router.state.location.pathname).toBe('/red-team/review')
  })
})

describe('experiment mode', () => {
  it('defaults to Paired Comparison, marks it recommended and explains the equivalence', async () => {
    await configure()
    const paired = screen.getByRole('radio', { name: /Paired Comparison/ })
    expect(paired).toBeChecked()
    expect(document.querySelector('[data-mode="paired"]')).toHaveTextContent('Recommended')
    const explainer = document.querySelector('[data-paired-explainer]') as HTMLElement
    for (const row of ['Scenario and attack input', 'Agent and model configuration', 'Identity and permissions', 'Resource snapshots', 'Available tools and task context']) {
      expect(within(explainer).getByRole('rowheader', { name: row })).toBeInTheDocument()
    }
    expect(within(explainer).getByText('Off')).toBeInTheDocument()
    expect(within(explainer).getByText('On')).toBeInTheDocument()
    expect(explainer).toHaveTextContent(/one intended difference is whether AegisAI protection is active/)
  })

  it('switches mode, warns that a single condition has nothing to compare, and can return to Paired', async () => {
    await configure()
    await userEvent.click(screen.getByRole('radio', { name: /^Baseline/ }))
    expect(screen.getByRole('radio', { name: /^Baseline/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Paired Comparison/ })).not.toBeChecked()
    expect(document.querySelector('[data-single-condition-warning]')).toHaveTextContent(/nothing to compare against/)
    expect(document.querySelector('[data-paired-explainer]')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /^Protected/ }))
    expect(document.querySelector('[data-single-condition-warning] [data-condition="protected"]')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Paired Comparison/ }))
    expect(document.querySelector('[data-paired-explainer]')).toBeInTheDocument()
  })

  it('always pairs the condition colour with an icon and a text label', async () => {
    await configure()
    for (const tag of document.querySelectorAll('[data-condition]')) {
      expect(tag.textContent?.trim()).toMatch(/Baseline|Protected/)
      expect(tag.querySelector('svg')).toBeInTheDocument()
    }
  })
})

describe('review', () => {
  it('restates the whole configuration and never claims a result', async () => {
    await review(`${FULL}&mode=paired`)
    const summary = document.querySelector('dl[aria-label="Configuration summary"]') as HTMLElement
    expect(summary.querySelector('[data-summary="scenario"]')).toHaveTextContent('Demo: data sent to an unapproved destination')
    expect(summary.querySelector('[data-summary="agent"]')).toHaveTextContent('Finance Agent')
    expect(summary.querySelector('[data-summary="resources"]')).toHaveTextContent('Q3 expense ledger')
    expect(summary.querySelector('[data-summary="resources"]')).toHaveTextContent('Payroll table')
    expect(summary.querySelector('[data-summary="resources"]')).toHaveTextContent('Restricted')
    expect(summary.querySelector('[data-summary="mode"]')).toHaveTextContent('Paired Comparison')
    expect(summary.querySelector('[data-summary="mode"]')).toHaveTextContent('Baseline: no AegisAI protection')
    expect(summary.querySelector('[data-summary="mode"]')).toHaveTextContent('Protected: AegisAI active')

    const compare = document.querySelector('[data-paired-review]') as HTMLElement
    expect(within(compare).getByRole('rowheader', { name: /AegisAI protection/ })).toBeInTheDocument()
    expect(compare).toHaveTextContent(/This describes the experiment design, not an outcome/)
    expect(within(screen.getByLabelText('Agent tools')).getAllByRole('listitem').length).toBeGreaterThan(0)

    const warnings = [...document.querySelectorAll('[data-warning]')].map((w) => w.getAttribute('data-warning'))
    expect(warnings).toEqual(['baseline-unprotected', 'restricted', 'mock'])
    expect(document.querySelector('[data-execution-note]')).toHaveTextContent('Execution: not started')
    expect(document.querySelector('[data-execution-note]')).toHaveTextContent(/No attack has been run, no result exists/)
    expect(screen.queryByRole('button', { name: /run|execute|start/i })).not.toBeInTheDocument()
    const main = (document.querySelector('main') as HTMLElement).textContent ?? ''
    expect(main).not.toMatch(/attack succeeded|AegisAI blocked|blocked the attack|\d+\s*%|\bpassed\b|\bscore/i)
  })

  it('shows a single condition without the paired table, with the right warnings', async () => {
    await review(`${FULL}&mode=protected`)
    expect(document.querySelector('[data-paired-review]')).not.toBeInTheDocument()
    expect([...document.querySelectorAll('[data-warning]')].map((w) => w.getAttribute('data-warning'))).toEqual(['single-condition', 'restricted', 'mock'])
    expect(document.querySelector('[data-summary="mode"] [data-condition="baseline"]')).not.toBeInTheDocument()
  })

  it('warns when a resource belongs to another domain than the agent', async () => {
    await review('scenario=demo-privilege-escalation&agent=agent-finance&resource=hlt-appointments&mode=paired')
    expect(document.querySelector('[data-warning="other-domain"]')).toHaveTextContent(/Appointment schedule belongs to a different domain than Finance Agent/)
  })

  it('shows the plain-data description with its provisional status', async () => {
    renderAt(`/red-team/review?${FULL}&mode=paired`)
    await userEvent.click(await screen.findByRole('button', { name: /Configuration as plain data/ }))
    expect(await screen.findByText(/not a backend request/)).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/"provisionalFrontendDraft": true/)
    expect(document.body.textContent).toMatch(/"sentToBackend": false/)
  })

  it('does not review an incomplete or invalid configuration', async () => {
    renderAt('/red-team/review?scenario=ghost&agent=nobody&mode=turbo')
    const box = await screen.findByText('This configuration is incomplete, so it cannot be reviewed yet')
    expect(box.closest('[data-review-incomplete]')).toHaveTextContent(/“ghost” is not in the scenario catalogue/)
    expect(box.closest('[data-review-incomplete]')).toHaveTextContent(/“turbo” is not a supported experiment mode/)
    expect(screen.getByRole('link', { name: 'Back to configuration' })).toHaveAttribute('href', expect.stringContaining('/red-team/configure?'))
    expect(document.querySelector('[data-summary]')).not.toBeInTheDocument()
  })
})

describe('unavailable and empty states', () => {
  it('shows backend-unavailable on both pages and never mock data when the backend is not connected', async () => {
    vi.spyOn(services.redTeam, 'listScenarios').mockRejectedValue(new NotConnectedError('The backend adapter for Red-Team scenarios is not implemented yet.'))
    vi.spyOn(services.agents, 'listAgents').mockRejectedValue(new NotConnectedError('agents'))
    vi.spyOn(services.resources, 'listResources').mockRejectedValue(new NotConnectedError('resources'))
    renderAt('/red-team/configure?scenario=demo-data-exfiltration')
    expect(await screen.findByText('The scenario library is unavailable: the backend is not connected')).toBeInTheDocument()
    expect(document.querySelector('[data-catalogue-state="backend-unavailable"]')).toHaveTextContent(/no demonstration data is shown/)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/Finance Agent/)).not.toBeInTheDocument()
  })

  it('shows backend-unavailable when only the agent and resource data are unavailable', async () => {
    vi.spyOn(services.agents, 'listAgents').mockRejectedValue(new NotConnectedError('agents are not implemented'))
    renderAt(`/red-team/review?${FULL}`)
    expect(await screen.findByText('The agent and resource data is unavailable: the backend is not connected')).toBeInTheDocument()
    expect(document.querySelector('[data-summary]')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no scenarios', async () => {
    vi.spyOn(services.redTeam, 'listScenarios').mockResolvedValue([])
    renderAt('/red-team/configure')
    expect(await screen.findByText('There are no scenarios to configure')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Scenario Catalogue' })).toHaveAttribute('href', '/red-team/scenarios')
  })

  it('says plainly that a configuration cannot be completed when no resources are defined', async () => {
    vi.spyOn(services.resources, 'listResources').mockResolvedValue([])
    renderAt(`/red-team/configure?${FULL}`)
    expect(await screen.findByText('No synthetic resources are available')).toBeInTheDocument()
    expect(document.querySelector('[data-catalogue-state="no-resources"]')).toHaveTextContent(/has not been confirmed with the backend/)
    await userEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/is not a known resource/)
  })

  it('says plainly when no agents are defined', async () => {
    vi.spyOn(services.agents, 'listAgents').mockResolvedValue([])
    renderAt('/red-team/configure?scenario=demo-data-exfiltration')
    expect(await screen.findByText('No agents are defined')).toBeInTheDocument()
  })

  it('shows loading first, and a retry after a generic failure', async () => {
    const spy = vi.spyOn(services.resources, 'listResources').mockRejectedValueOnce(new Error('boom'))
    renderAt('/red-team/configure?scenario=demo-data-exfiltration')
    expect(screen.getByText('Loading scenarios, agents and resources…')).toBeInTheDocument()
    expect(await screen.findByText("The agent and resource data couldn't be loaded")).toBeInTheDocument()
    spy.mockRestore()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { level: 2, name: '2. Target agent' })
  })
})
