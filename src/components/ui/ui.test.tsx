import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { diffRecords, DiffView } from './DiffView'
import { ExpandableDetails } from './ExpandableDetails'
import { StatePanel } from './StatePanel'
import { Stepper } from './Stepper'
import { Timeline } from './Timeline'

const steps = [
  { id: 'a', label: 'Request' },
  { id: 'b', label: 'Actions' },
  { id: 'c', label: 'Run' },
]

describe('Stepper', () => {
  it('marks the current step and lets completed steps be revisited', async () => {
    const onSelect = vi.fn()
    render(<Stepper steps={steps} currentIndex={1} onStepSelect={onSelect} />)
    const list = screen.getByRole('list', { name: 'Steps' })
    const items = within(list).getAllByRole('listitem')
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')

    await userEvent.click(within(list).getByRole('button', { name: /go back to step 1: request/i }))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('does not let users jump ahead to future steps', () => {
    render(<Stepper steps={steps} currentIndex={0} onStepSelect={() => {}} />)
    // Neither the full nor the compact (small-screen) variant offers any button yet.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('offers the same revisit behaviour in the compact small-screen variant', async () => {
    const onSelect = vi.fn()
    render(<Stepper steps={steps} currentIndex={2} onStepSelect={onSelect} />)
    const compact = screen.getByRole('list', { name: 'Progress' })
    const items = within(compact).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    // Completed segments are buttons; the current and future ones are not.
    expect(within(compact).getAllByRole('button')).toHaveLength(2)

    await userEvent.click(within(compact).getByRole('button', { name: /go back to step 2: actions/i }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('tells screen readers where the user is, in text', () => {
    render(<Stepper steps={steps} currentIndex={1} />)
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
  })
})

describe('DiffView', () => {
  it('computes field-level changes', () => {
    const rows = diffRecords({ a: 1, b: 'x' }, { a: 1, b: 'y', c: true })
    expect(rows.find((r) => r.key === 'a')?.changed).toBe(false)
    expect(rows.find((r) => r.key === 'b')?.changed).toBe(true)
    expect(rows.find((r) => r.key === 'c')).toMatchObject({ before: '—', after: 'true', changed: true })
  })

  it('labels changed fields in text and counts them', () => {
    render(<DiffView title="Record" before={{ s: 'draft', n: 1 }} after={{ s: 'done', n: 1 }} />)
    expect(screen.getByText('1 field changed')).toBeInTheDocument()
    expect(screen.getByText('(changed)')).toBeInTheDocument()
  })

  it('says so when nothing changed', () => {
    render(<DiffView title="Record" before={{ s: 'same' }} after={{ s: 'same' }} />)
    expect(screen.getByText('No changes')).toBeInTheDocument()
    expect(screen.queryByText('(changed)')).not.toBeInTheDocument()
  })

  it('handles a record that did not exist before', () => {
    render(<DiffView title="Record" before={null} after={{ s: 'new' }} />)
    expect(screen.getByText('1 field changed')).toBeInTheDocument()
  })
})

describe('StatePanel', () => {
  it('uses alert for errors and status for everything else', () => {
    const { rerender } = render(<StatePanel variant="error" title="Broke" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Broke')
    for (const variant of ['loading', 'empty', 'success', 'denied'] as const) {
      rerender(<StatePanel variant={variant} title={variant} />)
      expect(screen.getByRole('status')).toHaveTextContent(variant)
    }
  })
})

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Run</Button>)
    const button = screen.getByRole('button', { name: 'Run' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('ExpandableDetails', () => {
  it('reveals technical detail on demand', async () => {
    render(<ExpandableDetails>raw payload</ExpandableDetails>)
    expect(screen.queryByText('raw payload')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /technical details/i }))
    expect(screen.getByText('raw payload')).toBeInTheDocument()
  })
})

describe('Timeline', () => {
  it('renders every item in order', () => {
    render(
      <Timeline
        items={[
          { id: '1', title: 'First' },
          { id: '2', title: 'Second' },
        ]}
      />,
    )
    const items = within(screen.getByRole('list', { name: 'Timeline' })).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual(['First', 'Second'])
  })
})
