import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { DisagreementRate } from './DisagreementRate'
import type { JudgingStats } from '../../../shared/api/client'

const base: JudgingStats = {
  total: 50, both_judged: 40, disagreements: 4, disagreement_rate: 10,
  expected_range_low: 5, expected_range_high: 15,
  needs_review: 6, overridden: 2, prefiltered_out: 8, cross_checked: 40,
  injection_flagged: 0, disagreement_by_pair: { 'substantial -> accepted': 3, 'exceptional -> substantial': 1 },
}

describe('DisagreementRate', () => {
  it('shows the rate against the expected range', () => {
    renderWithProviders(<DisagreementRate stats={base} />)
    expect(screen.getByText('10.0%')).toBeInTheDocument()
    expect(screen.getByText(/4 of 40 double-judged · expected 5–15%/)).toBeInTheDocument()
  })

  // A rate over zero samples is unknown. 0% would read as perfect agreement.
  it('says the rate is unmeasured rather than showing zero', () => {
    renderWithProviders(
      <DisagreementRate stats={{ ...base, disagreement_rate: null, both_judged: 0, disagreements: 0 }} />,
    )
    expect(screen.getByText('not yet measured')).toBeInTheDocument()
    expect(screen.queryByText('0.0%')).not.toBeInTheDocument()
  })

  // The whole point of the metric: a high number is a definitions problem,
  // and the UI has to say so or it gets read as a queue-size problem.
  it('explains that a high rate means ambiguous bucket definitions', () => {
    renderWithProviders(<DisagreementRate stats={{ ...base, disagreement_rate: 40, disagreements: 16 }} />)
    expect(screen.getByText('40.0%')).toBeInTheDocument()
    expect(screen.getByText(/bucket definitions are ambiguous/)).toBeInTheDocument()
    expect(screen.getByText(/accepted\/substantial line/)).toBeInTheDocument()
  })

  it('stays quiet when the rate is inside the expected range', () => {
    renderWithProviders(<DisagreementRate stats={base} />)
    expect(screen.queryByText(/bucket definitions are ambiguous/)).not.toBeInTheDocument()
  })

  it('shows which bucket pairs disagree, so the ambiguity is locatable', () => {
    renderWithProviders(<DisagreementRate stats={base} />)
    expect(screen.getByText('substantial -> accepted ×3')).toBeInTheDocument()
    expect(screen.getByText('exceptional -> substantial ×1')).toBeInTheDocument()
  })

  it('surfaces injection flags only when there are any', () => {
    const { rerender } = renderWithProviders(<DisagreementRate stats={base} />)
    expect(screen.queryByText(/flagged for injection/)).not.toBeInTheDocument()
    rerender(<DisagreementRate stats={{ ...base, injection_flagged: 3 }} />)
    expect(screen.getByText('3 flagged for injection')).toBeInTheDocument()
  })
})
