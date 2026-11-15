import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConditionBadge } from './ConditionBadge'
import { SimulationBannerView } from './SimulationBanner'
import { SourceBadgeView } from './SourceBadge'

describe('SourceBadgeView', () => {
  it('shows MOCK / DEVELOPMENT for the mock source', () => {
    render(<SourceBadgeView configured="mock" status="ready" />)
    expect(screen.getByText('MOCK / DEVELOPMENT')).toBeInTheDocument()
    expect(screen.queryByText('CONNECTED BACKEND')).not.toBeInTheDocument()
  })

  it('shows CONNECTED BACKEND only when the backend is selected and reachable', () => {
    render(<SourceBadgeView configured="backend" status="ready" />)
    expect(screen.getByText('CONNECTED BACKEND')).toBeInTheDocument()
  })

  it('never claims a connection (or mock) when the backend is unreachable', () => {
    render(<SourceBadgeView configured="backend" status="error" />)
    expect(screen.getByText('BACKEND UNAVAILABLE')).toBeInTheDocument()
    expect(screen.queryByText('CONNECTED BACKEND')).not.toBeInTheDocument()
    expect(screen.queryByText('MOCK / DEVELOPMENT')).not.toBeInTheDocument()
  })

  it('shows a neutral checking state while loading', () => {
    render(<SourceBadgeView configured="backend" status="loading" />)
    expect(screen.getByText(/checking source/i)).toBeInTheDocument()
  })
})

describe('SimulationBannerView', () => {
  it('is shown for mock data and says it is not backend evidence', () => {
    render(<SimulationBannerView source="mock" />)
    expect(screen.getByRole('note')).toHaveTextContent(/not evidence from the AegisAI backend/i)
  })

  it('is absent for the backend source', () => {
    const { container } = render(<SimulationBannerView source="backend" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ConditionBadge', () => {
  it('distinguishes baseline and protected by label, not just colour', () => {
    render(
      <>
        <ConditionBadge condition="baseline" />
        <ConditionBadge condition="protected" />
      </>,
    )
    expect(screen.getByText('Baseline')).toHaveAttribute('data-condition', 'baseline')
    expect(screen.getByText('Protected')).toHaveAttribute('data-condition', 'protected')
  })
})
