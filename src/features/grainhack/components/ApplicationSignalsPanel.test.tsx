import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApplicationSignalsPanel } from './ApplicationSignalsPanel'

const mockGetHackathonApplicationSignals = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonApplicationSignals: (...args: unknown[]) => mockGetHackathonApplicationSignals(...args),
}))

const FULL_SIGNALS = {
  repo_created_at: { computed: true, value: '2024-01-15T00:00:00Z' },
  had_commits_before_announced: { computed: true, value: true },
  commit_activity_90d: { computed: true, value: 42 },
  distinct_contributors: { computed: true, value: 7 },
  prior_grainhack_participation: { computed: true, value: [] },
  median_time_to_first_review_hours: { computed: true, value: 5.25 },
  prior_flagged_associations: { computed: false, note: 'Not available in this slice.' },
}

describe('ApplicationSignalsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads signals on mount for the given application and formats each value type', async () => {
    mockGetHackathonApplicationSignals.mockResolvedValue(FULL_SIGNALS)

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)

    await waitFor(() => expect(mockGetHackathonApplicationSignals).toHaveBeenCalledWith('app-1', false))
    expect(await screen.findByText('Yes')).toBeInTheDocument() // had_commits_before_announced
    expect(screen.getByText('42')).toBeInTheDocument() // commit_activity_90d
    expect(screen.getByText('5.3h')).toBeInTheDocument() // median_time_to_first_review_hours
    expect(screen.getByText('None')).toBeInTheDocument() // empty prior_grainhack_participation array
    expect(screen.getByText('Not available in this slice.')).toBeInTheDocument() // not computed
  })

  it('shows an error message when the signals call fails', async () => {
    mockGetHackathonApplicationSignals.mockRejectedValue(new Error('github_rate_limited'))

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)

    expect(await screen.findByText('github_rate_limited')).toBeInTheDocument()
  })

  it('the refresh button re-fetches with refresh=true', async () => {
    mockGetHackathonApplicationSignals.mockResolvedValue(FULL_SIGNALS)
    const user = userEvent.setup()

    renderWithProviders(<ApplicationSignalsPanel applicationId="app-1" />)
    await screen.findByText('Auto-collected signals')

    await user.click(screen.getByTitle('Refresh signals'))

    await waitFor(() => expect(mockGetHackathonApplicationSignals).toHaveBeenCalledWith('app-1', true))
    expect(mockGetHackathonApplicationSignals).toHaveBeenCalledTimes(2)
  })
})
