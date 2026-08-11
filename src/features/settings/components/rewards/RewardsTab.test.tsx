import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { RewardsTab } from './RewardsTab'

const mockGetSocialFollowStatus = vi.fn()
const mockSubmitSocialFollowProof = vi.fn()

vi.mock('../../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../../shared/api/client')>('../../../../shared/api/client')
  return {
    ...actual,
    getSocialFollowStatus: (...args: unknown[]) => mockGetSocialFollowStatus(...args),
    submitSocialFollowProof: (...args: unknown[]) => mockSubmitSocialFollowProof(...args),
  }
})

const BASE_SOCIAL_FOLLOW = {
  platforms: [
    { platform: 'github', status: 'approved' },
    { platform: 'telegram', status: 'pending' },
    { platform: 'linkedin', status: null },
  ],
  completed: false,
  points_awarded: 0,
  points_reward: 500,
}

describe('RewardsTab', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSocialFollowStatus.mockResolvedValue(BASE_SOCIAL_FOLLOW)
    mockSubmitSocialFollowProof.mockResolvedValue({ ok: true })
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    })
  })

  it('shows no points balance, USDC estimate, or redeem button', async () => {
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    // The points programme is retired. This tab advertising a balance, a USDC
    // conversion, or a way to redeem would contradict the retirement that has
    // already shipped everywhere else.
    expect(screen.queryByText(/points/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/USDC/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /redeem/i })).not.toBeInTheDocument()
  })

  it('frames following as eligibility rather than something that earns', async () => {
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    expect(screen.getByText(/required to be eligible/i)).toBeInTheDocument()
    expect(screen.getByText(/earns no shares/i)).toBeInTheDocument()
    // No wording anywhere may suggest following pays - that is the exact
    // promise just retired.
    expect(screen.queryByText(/you earn/i)).not.toBeInTheDocument()
  })

  it('shows per-platform social-follow status', async () => {
    renderWithProviders(<RewardsTab />)
    await waitFor(() => expect(mockGetSocialFollowStatus).toHaveBeenCalled())
    expect(await screen.findByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Pending review')).toBeInTheDocument()
  })

  it('shows the completed banner once the social-follow program is done', async () => {
    mockGetSocialFollowStatus.mockResolvedValue({ ...BASE_SOCIAL_FOLLOW, completed: true, points_awarded: 500 })
    renderWithProviders(<RewardsTab />)
    expect(await screen.findByText(/Completed - you earned 500 points/)).toBeInTheDocument()
  })

  it('uploading a screenshot submits it as a data URL for that platform', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    const file = new File(['fake-image-bytes'], 'proof.png', { type: 'image/png' })
    // Platforms render in SOCIAL_FOLLOW_PLATFORMS order (github, telegram,
    // linkedin); only non-approved platforms get an upload input, so with
    // github already approved the first input belongs to telegram.
    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs.length).toBe(2)
    await user.upload(inputs[0] as HTMLInputElement, file)

    await waitFor(() => expect(mockSubmitSocialFollowProof).toHaveBeenCalledTimes(1))
    const [platform, screenshot] = mockSubmitSocialFollowProof.mock.calls[0]
    expect(platform).toBe('telegram')
    expect(screenshot).toMatch(/^data:/)
  })

  it('rejects a non-image file before calling the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    const badFile = new File(['not an image'], 'notes.txt', { type: 'text/plain' })
    const inputs = document.querySelectorAll('input[type="file"]')
    await user.upload(inputs[0] as HTMLInputElement, badFile)

    expect(mockSubmitSocialFollowProof).not.toHaveBeenCalled()
  })

  it('shows an error state and does not crash when loading fails', async () => {
    mockGetSocialFollowStatus.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<RewardsTab />)
    await waitFor(() => expect(mockGetSocialFollowStatus).toHaveBeenCalled())
    expect(await screen.findByText(/Couldn't load your rewards info/)).toBeInTheDocument()
  })
})
