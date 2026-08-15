import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ContributorsPage } from './ContributorsPage'

// ContributorsPage is a tab shell around three children. All three now fetch:
// ContributionsTab (getMyIssueApplications), ProjectsTab (getProjectsContributed)
// and RewardsTab (getMyRedemptions).
//
// Projects and Rewards used to render hardcoded arrays instead - five projects
// nobody had contributed to, and seven payouts dated through 2025 with amounts
// of the literal string "--- undefined". These tests asserted that fabricated
// content, so they passed while the page told contributors they had been paid.
// They now assert the opposite: that the empty state is what an account with no
// data actually sees.
const mockGetMyIssueApplications = vi.fn()
const mockGetProjectsContributed = vi.fn()
const mockGetMyRedemptions = vi.fn()

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/api/client')>('../../../shared/api/client')
  return {
    ...actual,
    getMyIssueApplications: (...args: unknown[]) => mockGetMyIssueApplications(...args),
    getProjectsContributed: (...args: unknown[]) => mockGetProjectsContributed(...args),
    getMyRedemptions: (...args: unknown[]) => mockGetMyRedemptions(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SAMPLE_APPLICATION = {
  id: 'app-1',
  status: 'applied' as const,
  project_id: 'proj-1',
  project_name: 'test-owner/test-repo',
  issue_number: 42,
  issue_title: 'Add dark mode support to settings page',
  issue_url: 'https://github.com/test-owner/test-repo/issues/42',
  labels: ['enhancement'],
  applied_at: '2026-01-01T00:00:00Z',
}

describe('ContributorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMyIssueApplications.mockResolvedValue({ issue_applications: [SAMPLE_APPLICATION] })
    // The state production is actually in: no contributed projects, no
    // redemptions. Zero redemptions was verified against production on
    // 2026-08-11 and no settlement has run since.
    mockGetProjectsContributed.mockResolvedValue([])
    mockGetMyRedemptions.mockResolvedValue({ redemptions: [] })
  })

  it('renders the Contributions tab by default', async () => {
    renderWithProviders(<ContributorsPage />)

    expect(screen.getByRole('button', { name: 'Contributions' })).toBeInTheDocument()
    // Real content fetched by ContributionsTab. It renders twice (once in the
    // desktop kanban layout, once in the mobile stacked layout - both are always
    // present in jsdom since there's no real viewport to apply the Tailwind
    // `hidden md:block` / `md:hidden` breakpoint classes).
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
  })

  it('shows an honest empty state on Projects rather than invented rows', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
    // The names that used to fill this tab. Asserted by name rather than by
    // count so the failure message names the fabrication if it returns.
    for (const fake of ['React Ecosystem', 'Next.js Framework', 'Vue.js', 'Django']) {
      expect(screen.queryByText(fake)).not.toBeInTheDocument()
    }
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument()
  })

  it('renders real contributed projects when the account has them', async () => {
    mockGetProjectsContributed.mockResolvedValue([
      {
        id: 'p1',
        github_full_name: 'stellar/soroban-examples',
        status: 'active',
        ecosystem_name: 'Stellar',
        language: 'Rust',
      },
    ])
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect((await screen.findAllByText('stellar/soroban-examples')).length).toBeGreaterThan(0)
    // The two columns with no backing must stay gone rather than come back
    // as zeros: a zero invites "why zero?", an absent column asks nothing.
    expect(screen.queryByText('My rewards')).not.toBeInTheDocument()
    expect(screen.queryByText('My contributions')).not.toBeInTheDocument()
  })

  it('shows "No rewards yet" and no fabricated payouts on Rewards', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Rewards' }))

    expect(await screen.findByText('No rewards yet')).toBeInTheDocument()
    expect(screen.getByText(/first funded hackathon hasn't run/i)).toBeInTheDocument()
    // The placeholder that shipped in the Amount column.
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
    expect(screen.queryByText('Complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Processing')).not.toBeInTheDocument()
  })

  it('renders real redemptions when the account has them', async () => {
    mockGetMyRedemptions.mockResolvedValue({
      redemptions: [
        {
          id: 'r1',
          points_spent: 500,
          usdc_amount: '5.00',
          stellar_wallet_address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
          status: 'paid' as const,
          created_at: '2026-08-01T00:00:00Z',
        },
      ],
    })
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Rewards' }))

    expect(await screen.findByText('5.00 USDC')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.queryByText('No rewards yet')).not.toBeInTheDocument()
  })

  it('offers no payout actions, because there is no payout flow', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Rewards' }))
    await screen.findByText('No rewards yet')

    // Both were rendered with no onClick - styled buttons that did nothing,
    // advertising a flow that does not exist. A primary-styled "Request
    // payment" is a promise.
    expect(screen.queryByText('See transactions')).not.toBeInTheDocument()
    expect(screen.queryByText('Request payment')).not.toBeInTheDocument()
  })

  it('renders in both light and dark theme without crashing', async () => {
    const { unmount } = renderWithProviders(<ContributorsPage />, { theme: 'light' })
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
    unmount()

    renderWithProviders(<ContributorsPage />, { theme: 'dark' })
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
  })
})
