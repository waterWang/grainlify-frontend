import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ContributorsPage } from './ContributorsPage'

// ContributorsPage itself fetches nothing and takes no props - it is a pure tab
// shell around three children (ContributionsTab, ProjectsTab, RewardsTab).
// ContributionsTab fetches the current user's issue applications on mount
// (getMyIssueApplications), so it's mocked below the same way RedeemPage.test.tsx
// mocks getMyRedemptions; ProjectsTab/RewardsTab still render their own
// hardcoded mock data with no API calls (confirmed by reading both in full).
const mockGetMyIssueApplications = vi.fn()

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/api/client')>('../../../shared/api/client')
  return {
    ...actual,
    getMyIssueApplications: (...args: unknown[]) => mockGetMyIssueApplications(...args),
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
  })

  it('renders the Contributions tab by default', async () => {
    renderWithProviders(<ContributorsPage />)

    expect(screen.getByRole('button', { name: 'Contributions' })).toBeInTheDocument()
    // Real content fetched by ContributionsTab. It renders twice (once in the
    // desktop kanban layout, once in the mobile stacked layout - both are always
    // present in jsdom since there's no real viewport to apply the Tailwind
    // `hidden md:block` / `md:hidden` breakpoint classes).
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
    // Rewards-only action buttons are not shown on the Contributions tab.
    expect(screen.queryByText('Request payment')).not.toBeInTheDocument()
  })

  it('switches to the Projects tab content when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Projects' }))

    expect(screen.getByText('Project name')).toBeInTheDocument()
    expect(screen.getAllByText('React Ecosystem').length).toBeGreaterThan(0)
    expect(
      screen.queryByText('Add dark mode support to settings page'),
    ).not.toBeInTheDocument()
  })

  it('switches to the Rewards tab content and reveals its action buttons', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContributorsPage />)

    await user.click(screen.getByRole('button', { name: 'Rewards' }))

    expect(screen.getByText('See transactions')).toBeInTheDocument()
    expect(screen.getByText('Request payment')).toBeInTheDocument()
    // Rewards mock data.
    expect(screen.getAllByText('Pending request').length).toBeGreaterThan(0)
  })

  it('renders in both light and dark theme without crashing', async () => {
    const { unmount } = renderWithProviders(<ContributorsPage />, { theme: 'light' })
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
    unmount()

    renderWithProviders(<ContributorsPage />, { theme: 'dark' })
    expect((await screen.findAllByText('Add dark mode support to settings page')).length).toBeGreaterThan(0)
  })
})
