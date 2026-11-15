import { StrictMode, useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DemoWorkspace } from './DemoWorkspace'

const steps = [
  { id: 'a', label: 'One' },
  { id: 'b', label: 'Two' },
]

function Harness() {
  const [index, setIndex] = useState(0)
  return (
    <DemoWorkspace
      eyebrow="TEST"
      title="Workspace"
      summary="Summary"
      instruction="Do the thing"
      steps={steps}
      currentIndex={index}
      stageTitle={`Stage ${index + 1}`}
      onBack={index > 0 ? () => setIndex(index - 1) : undefined}
      primaryAction={{ label: 'Next', onClick: () => setIndex(1) }}
    >
      body
    </DemoWorkspace>
  )
}

describe('DemoWorkspace focus management', () => {
  it('does not steal focus (or scroll the page) on first load, even under StrictMode', async () => {
    render(
      <StrictMode>
        <Harness />
      </StrictMode>,
    )
    const heading = await screen.findByRole('heading', { name: 'Stage 1' })
    expect(heading).not.toHaveFocus()
    expect(document.body).toHaveFocus()
  })

  it('moves focus to the new stage heading when the step changes', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Stage 2' })).toHaveFocus()
  })

  it('shows the consistent frame: instruction, progress, back bottom-left, primary action', async () => {
    render(<Harness />)
    expect(screen.getByText(/what to do/i)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument()
  })
})
