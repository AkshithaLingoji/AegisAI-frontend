import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders, queryClient } from '@/app/providers'
import { routes } from '@/app/routes'
import { NotConnectedError, RunServiceError, services } from '@/services'
import { useGuidedStore } from '@/state/guidedStore'
import { MAX_INPUT_BYTES } from '@/lib/runs/inputs'


function renderTasks() {
  const router = createMemoryRouter(routes, { initialEntries: ['/tasks'] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => {
  queryClient.clear()
  useGuidedStore.getState().reset()
})
afterEach(() => vi.restoreAllMocks())

const choose = async (title: RegExp) => userEvent.click(await screen.findByRole('button', { name: title }))
const startSimulation = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /continue to the simulation/i }))
  await userEvent.click(await screen.findByRole('button', { name: /start simulation/i }))
}

describe('catalogue and selection', () => {
  it('shows FIN-01, FIN-02, HLT-01 and the custom task, and not HLT-02', async () => {
    renderTasks()
    expect(await screen.findByRole('heading', { level: 1, name: 'Guided Tasks' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Guided tasks' })
    for (const title of ['Expense report', 'Injected payroll export', 'Health summary', 'Custom task']) {
      expect(within(list).getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    }
    expect(within(list).queryByText('HLT-02')).not.toBeInTheDocument()
    expect(within(list).getByText('Contains an untrusted instruction')).toBeInTheDocument()
    expect(screen.getByText(/lost when the page reloads/i)).toBeInTheDocument()
  })

  it('selecting a task opens its context with the request verbatim and trust shown', async () => {
    renderTasks()
    await choose(/Choose Injected payroll export/)
    expect(await screen.findByRole('heading', { name: 'Review the task and its context' })).toHaveFocus()
    expect(screen.getByText("Summarise this quarter's team expenses and flag anything unusual.")).toBeInTheDocument()
    const inputs = document.querySelector('[data-context="inputs"]') as HTMLElement
    expect(within(inputs).getByText('Untrusted (catalogue)')).toBeInTheDocument()
    expect(within(inputs).getByText(/NOTE TO ASSISTANT/)).toBeInTheDocument()
    expect(screen.getByText(/Simulated acting identity/)).toBeInTheDocument()
  })

  it('shows a trusted-by-declaration catalogue document with the caveat, for a legitimate task', async () => {
    renderTasks()
    await choose(/Choose Health summary/)
    const inputs = await screen.findByText(/Documents the agent retrieves/)
    expect(inputs).toBeInTheDocument()
    expect(screen.getByText('Declared trusted (catalogue)')).toBeInTheDocument()
    expect(screen.getAllByText(/not a verdict that the content is safe/i).length).toBeGreaterThan(0)
  })
})

describe('allowed and denied actions', () => {
  it('FIN-02: the export is DENY / blocked / did not run, and reads are allowed and ran', async () => {
    renderTasks()
    await choose(/Choose Injected payroll export/)
    await startSimulation()
    await screen.findByRole('heading', { name: 'Inspect the decisions' })
    const exportCard = (await screen.findByRole('article', { name: /Export the payroll table/ })) as HTMLElement
    expect(exportCard).toHaveAttribute('data-tone', 'red')
    expect(within(exportCard).getByText('DENY')).toBeInTheDocument()
    expect(within(exportCard).getByText(/blocked at the gateway and did not run/)).toBeInTheDocument()
    expect(within(exportCard).getByText('Blocked')).toBeInTheDocument()
    expect(within(exportCard).getByText('Did not run')).toBeInTheDocument()
    expect(within(exportCard).getByText(/OUT_OF_SCOPE_RESOURCE/)).toBeInTheDocument()
    const read = screen.getByRole('article', { name: /Read the Q3 expense ledger/ })
    expect(within(read).getByText('ALLOW')).toBeInTheDocument()
    expect(within(read).getByText(/dispatched and ran/)).toBeInTheDocument()
    expect(screen.getByText(/Evaluation is not enforcement/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Approve/ })).not.toBeInTheDocument()
  })
})

describe('approval and resume', () => {
  it('FIN-01 pauses with only the actions up to the approval, then resumes after approval to a final result', async () => {
    renderTasks()
    await choose(/Choose Expense report/)
    await startSimulation()
    await screen.findByRole('heading', { name: 'Inspect the decisions' })
    expect(await screen.findByText(/waiting for a simulated human approval/)).toBeInTheDocument()
    expect(document.querySelector('[data-paused-note]')).toHaveTextContent(/have not been proposed, evaluated or dispatched/)
    const pending = screen.getByRole('article', { name: /Save the Q3 expense summary/ })
    expect(within(pending).getByText('REQUIRE APPROVAL')).toBeInTheDocument()
    expect(within(pending).getByText('Nothing dispatched or blocked yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /see the final result/i })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/optional note/i), 'Reviewed')
    await userEvent.click(screen.getByRole('button', { name: /^Approve: Save the Q3 expense summary/ }))
    await waitFor(() => expect(screen.queryByText(/waiting for a simulated human approval/)).not.toBeInTheDocument())
    const resolved = screen.getByRole('article', { name: /Save the Q3 expense summary/ })
    expect(within(resolved).getByText(/Approval was granted: it was dispatched and ran/)).toBeInTheDocument()
    expect(within(resolved).getByText(/Your note: “Reviewed”/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /see the final result/i }))
    expect(await screen.findByRole('heading', { name: 'Final result' })).toBeInTheDocument()
    expect(screen.getByText('Completed: every proposed action ran')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Run timeline' })).toBeInTheDocument()
    expect(screen.getByText(/Simulated approval granted/)).toBeInTheDocument()
    expect(screen.getByText('Q3 expense summary')).toBeInTheDocument() // changed resource
  })

  it('rejecting blocks the action; the result is completed partially', async () => {
    renderTasks()
    await choose(/Choose Expense report/)
    await startSimulation()
    await userEvent.click(await screen.findByRole('button', { name: /^Reject: Save the Q3 expense summary/ }))
    await waitFor(() => expect(screen.queryByText(/waiting for a simulated human approval/)).not.toBeInTheDocument())
    const card = screen.getByRole('article', { name: /Save the Q3 expense summary/ })
    expect(card).toHaveAttribute('data-tone', 'red')
    expect(within(card).getByText(/Approval was rejected: it was blocked and did not run/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /see the final result/i }))
    expect(await screen.findByText('Completed partially: 2 of 3 actions ran')).toBeInTheDocument()
  })

  it('shows a clear error when the approval was already resolved, and keeps the controls honest', async () => {
    renderTasks()
    await choose(/Choose Expense report/)
    await startSimulation()
    const approve = await screen.findByRole('button', { name: /^Approve: Save the Q3 expense summary/ })
    vi.spyOn(services.runs, 'resolveApproval').mockRejectedValueOnce(new RunServiceError('already-resolved', 'done'))
    await userEvent.click(approve)
    expect(await screen.findByText('This approval has already been resolved.')).toBeInTheDocument()
  })

  it('a reopened run in this session keeps its place', async () => {
    renderTasks()
    await choose(/Choose Expense report/)
    await startSimulation()
    await screen.findByText(/waiting for a simulated human approval/)
    useGuidedStore.getState().reset()
    expect(await screen.findByRole('heading', { name: 'Choose a task' })).toBeInTheDocument()
    const paused = (await screen.findAllByText(/Paused: waiting for approval/))[0]!.closest('li') as HTMLElement
    await userEvent.click(within(paused).getByRole('button', { name: /Reopen run/ }))
    expect(await screen.findByRole('heading', { name: 'Inspect the decisions' })).toBeInTheDocument()
  })
})

describe('custom task', () => {
  const fill = async (request = '  My request  ') => {
    await userEvent.click(await screen.findByRole('button', { name: 'Create a custom task' }))
    await userEvent.type(await screen.findByLabelText('Task name'), 'My custom task')
    const box = screen.getByLabelText('What should the agent do?')
    await userEvent.click(box)
    await userEvent.paste(request)
    await userEvent.click(screen.getByRole('radio', { name: /FIN-02/ }))
  }

  it('blocks continuing until the form is valid and explains what is missing', async () => {
    renderTasks()
    await userEvent.click(await screen.findByRole('button', { name: 'Create a custom task' }))
    await userEvent.click(await screen.findByRole('button', { name: /continue to the simulation/i }))
    const alert = await screen.findByText(/Please fix the following/)
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('Give the task a name.')).toBeInTheDocument()
    expect(screen.getByText('Choose which supported script the simulated agent follows.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start simulation/i })).not.toBeInTheDocument()
  })

  it('is honest about limits and offers no way to raise trust', async () => {
    renderTasks()
    await userEvent.click(await screen.findByRole('button', { name: 'Create a custom task' }))
    await screen.findByLabelText('What should the agent do?')
    expect(document.getElementById('custom-request-help')).toHaveTextContent(/does not read or understand this text/)
    expect(screen.getByText(/File upload is not supported/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add an input' }))
    const input = document.querySelector('[data-draft-input]') as HTMLElement
    expect(within(input).getByText('Untrusted by default')).toBeInTheDocument()
    expect(within(input).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(input).queryByText(/trusted$/i)).not.toBeInTheDocument()
  })

  it('enforces five inputs and rejects an oversized input without truncating', async () => {
    renderTasks()
    await userEvent.click(await screen.findByRole('button', { name: 'Create a custom task' }))
    const add = await screen.findByRole('button', { name: 'Add an input' })
    for (let i = 0; i < 5; i++) await userEvent.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText(/maximum of 5 inputs has been reached/)).toBeInTheDocument()
    const first = document.querySelector('[data-draft-input] textarea') as HTMLTextAreaElement
    await userEvent.click(first)
    await userEvent.paste('a'.repeat(MAX_INPUT_BYTES + 1))
    expect(first.value.length).toBe(MAX_INPUT_BYTES + 1) // the text is still all there
    expect(await screen.findByText(/204,801 bytes; the limit is 204,800 bytes.*will not be truncated/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Task name'), 'X')
    await userEvent.click(screen.getByRole('button', { name: /continue to the simulation/i }))
    expect(screen.queryByRole('button', { name: /start simulation/i })).not.toBeInTheDocument()
  })

  it('runs through the service with the request verbatim and untrusted input', async () => {
    renderTasks()
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Add an input' }))
    const content = document.querySelector('[data-draft-input] textarea') as HTMLTextAreaElement
    await userEvent.click(content)
    await userEvent.paste('  sample text  ')
    const spy = vi.spyOn(services.runs, 'startRun')
    await startSimulation()
    await screen.findByRole('heading', { name: 'Inspect the decisions' })
    expect(spy).toHaveBeenCalledTimes(1)
    const sent = spy.mock.calls[0]![0]
    expect(sent.simulationScenarioId).toBe('FIN-02')
    expect(sent.task.request).toBe('  My request  ')
    expect(sent.task.inputs[0]).toMatchObject({ content: '  sample text  ', trust: { level: 'untrusted', assignedBy: 'default' } })
    // the script (FIN-02) decided the actions, including the denied export
    expect(await screen.findByRole('article', { name: /Export the payroll table/ })).toHaveAttribute('data-tone', 'red')
    await userEvent.click(screen.getByRole('button', { name: /see the final result/i }))
    await userEvent.click(await screen.findByText('Inputs, digests and provenance'))
    expect(await screen.findByText('Untrusted by default')).toBeInTheDocument()
  })
})

describe('error and empty states', () => {
  it('shows an error without mock data when the catalogue cannot be loaded, then recovers on retry', async () => {
    const spy = vi.spyOn(services.tasks, 'listTasks').mockRejectedValueOnce(new NotConnectedError('The backend adapter for guided tasks is not implemented yet.'))
    renderTasks()
    expect(await screen.findByText("The guided tasks couldn't be loaded")).toBeInTheDocument()
    expect(screen.getByText(/does not substitute mock data/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Expense report' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Expense report' })).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state for an empty catalogue', async () => {
    vi.spyOn(services.tasks, 'listTasks').mockResolvedValueOnce([])
    renderTasks()
    expect(await screen.findByText('No guided tasks are available')).toBeInTheDocument()
  })

  it('shows the service’s validation message when a run cannot be started, and runs nothing', async () => {
    vi.spyOn(services.runs, 'startRun').mockRejectedValueOnce(new RunServiceError('invalid-input', 'Invalid task input.', ['Too large.']))
    renderTasks()
    await choose(/Choose Health summary/)
    await startSimulation()
    const alert = await screen.findByText('The simulation could not be started.')
    expect(alert.closest('[data-run-error]')).toHaveTextContent('Too large.')
    expect(alert.closest('[data-run-error]')).toHaveTextContent(/Nothing ran/)
  })

  it('shows a loading state while the catalogue loads', async () => {
    renderTasks()
    expect(screen.getByText('Loading the guided tasks…')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 3, name: 'Expense report' })
  })
})
