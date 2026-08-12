import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { ReferralsTab } from './ReferralsTab'

const mockGetReferralStats = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  getReferralStats: (...args: unknown[]) => mockGetReferralStats(...args),
}))

const BASE_STATS = {
  code: 'ABCD1234',
  total_referred: 3,
  pending: 1,
  completed: 2,
  points_earned: 200,
  points_per_referral: 100,
  // Served by the backend from the same constant it enforces the window with.
  referral_window_days: 30,
}

describe('ReferralsTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetReferralStats.mockResolvedValue(BASE_STATS)
  })

  it('loads and displays the referral code and stats', async () => {
    renderWithProviders(<ReferralsTab />)
    await waitFor(() => expect(mockGetReferralStats).toHaveBeenCalledTimes(1))

    expect(await screen.findByText('ABCD1234')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // total referred
    // The "Points Earned" stat is gone: points are retired, and a running
    // share total is not shown because a share only means something once the
    // pool is divided.
    expect(screen.queryByText('Points Earned')).not.toBeInTheDocument()
    expect(screen.queryByText(/you earn \d+ points/i)).not.toBeInTheDocument()
  })

  it('renders the share link using the current origin and the code', async () => {
    renderWithProviders(<ReferralsTab />)
    const expected = `${window.location.origin}/?ref=ABCD1234`
    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('copying the referral code writes it to the clipboard', async () => {
    // user-event's setup() is what creates navigator.clipboard in jsdom in
    // the first place - it must run before it can be spied on.
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

    renderWithProviders(<ReferralsTab />)
    await screen.findByText('ABCD1234')

    const copyButton = screen.getByRole('button', { name: 'Copy your referral code' })
    await user.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('ABCD1234')
  })

  it('shows an error state and does not crash when loading fails', async () => {
    mockGetReferralStats.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<ReferralsTab />)
    await waitFor(() => expect(mockGetReferralStats).toHaveBeenCalled())
    expect(await screen.findByText(/Couldn't load your referral info/)).toBeInTheDocument()
  })
})
