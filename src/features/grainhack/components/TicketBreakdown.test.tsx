import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen, within } from '../../../test/renderWithProviders'
import { TicketBreakdown } from './TicketBreakdown'
import type { HackathonDrawCandidate } from '../../../shared/api/client'

const POOL: HackathonDrawCandidate[] = [
  {
    user_id: 'u-newcomer',
    github_login: 'newcomer',
    fit: 'plausible',
    is_newcomer: true,
    weights: { fit_plausible: 1, first_ever_application: 1.5 },
    tickets: 1.5,
  },
  {
    user_id: 'u-veteran',
    github_login: 'veteran',
    fit: 'strong',
    is_newcomer: false,
    weights: { fit_strong: 2, prior_completion: 2.25 },
    tickets: 4.5,
  },
  {
    user_id: 'u-abandoner',
    github_login: 'abandoner',
    fit: 'plausible',
    is_newcomer: true,
    weights: { fit_plausible: 1, per_abandon: 0.5 },
    tickets: 0.5,
  },
]

describe('TicketBreakdown', () => {
  it('shows an empty-pool message rather than a blank table', () => {
    renderWithProviders(<TicketBreakdown pool={[]} />)
    expect(screen.getByText('Nobody was in this pool.')).toBeInTheDocument()
  })

  it('ranks applicants by odds, highest first', () => {
    renderWithProviders(<TicketBreakdown pool={POOL} />)
    const rows = screen.getAllByRole('row').slice(1) // drop the header
    const logins = rows.map((r) => within(r).getByText(/newcomer|veteran|abandoner/).textContent)
    expect(logins).toEqual(['veteran', 'newcomer', 'abandoner'])
  })

  it('computes each applicant\'s odds as a share of the whole pool', () => {
    renderWithProviders(<TicketBreakdown pool={POOL} />)
    // Total tickets = 6.5; veteran 4.5 -> 69.2%, newcomer 1.5 -> 23.1%.
    expect(screen.getByText('69.2%')).toBeInTheDocument()
    expect(screen.getByText('23.1%')).toBeInTheDocument()
    expect(screen.getByText('7.7%')).toBeInTheDocument()
  })

  it('breaks out every weight factor, which is what makes the result explainable', () => {
    renderWithProviders(<TicketBreakdown pool={POOL} />)
    expect(screen.getByText(/First-ever application ×1.5/)).toBeInTheDocument()
    expect(screen.getByText(/Prior completions ×2.25/)).toBeInTheDocument()
    expect(screen.getByText(/Strong fit ×2/)).toBeInTheDocument()
    // A penalty is still shown as a factor, not hidden.
    expect(screen.getByText(/Prior abandons ×0.5/)).toBeInTheDocument()
  })

  it('marks the winner and the viewing contributor', () => {
    renderWithProviders(
      <TicketBreakdown pool={POOL} winnerUserId="u-veteran" highlightUserId="u-newcomer" />
    )
    expect(screen.getByText('Won')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('marks newcomers, since reservation eligibility depends on it', () => {
    renderWithProviders(<TicketBreakdown pool={POOL} />)
    expect(screen.getAllByText('Newcomer')).toHaveLength(2)
  })

  it('humanizes an unrecognised weight key rather than dropping it', () => {
    renderWithProviders(
      <TicketBreakdown
        pool={[{ ...POOL[0], weights: { some_future_weight: 1.25 }, tickets: 1.25 }]}
      />
    )
    expect(screen.getByText(/Some Future Weight ×1.25/)).toBeInTheDocument()
  })
})
