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
  platforms: ['linkedin', 'x'],
  submitted: false,
  status: null,
  eligible: false,
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

  it('will not submit until a screenshot is chosen for both platforms', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    const submit = screen.getByRole('button', { name: /submit both for review/i })
    expect(submit).toBeDisabled()

    // One platform is not enough. The API refuses a partial submission, and
    // the UI must not offer one either.
    const file = new File(['x'], 'linkedin.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('LinkedIn screenshot'), file)
    expect(screen.getByRole('button', { name: /submit both for review/i })).toBeDisabled()
    expect(mockSubmitSocialFollowProof).not.toHaveBeenCalled()

    await user.upload(screen.getByLabelText('X screenshot'), new File(['y'], 'x.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /submit both for review/i })).toBeEnabled())
  })

  it('submits both screenshots in one call', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RewardsTab />)
    await screen.findByText('Social Follow')

    await user.upload(screen.getByLabelText('LinkedIn screenshot'), new File(['a'], 'l.png', { type: 'image/png' }))
    await user.upload(screen.getByLabelText('X screenshot'), new File(['b'], 'x.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: /submit both for review/i }))

    await waitFor(() => expect(mockSubmitSocialFollowProof).toHaveBeenCalledTimes(1))
    const arg = mockSubmitSocialFollowProof.mock.calls[0][0] as { linkedin: string; x: string }
    expect(arg.linkedin).toMatch(/^data:image\/png/)
    expect(arg.x).toMatch(/^data:image\/png/)
  })

  it('tells a revoked contributor why, and how to become eligible again', async () => {
    mockGetSocialFollowStatus.mockResolvedValue({
      platforms: ['linkedin', 'x'],
      submitted: true,
      status: 'revoked',
      decision_reason: 'no longer following on LinkedIn',
      eligible: false,
    })
    renderWithProviders(<RewardsTab />)

    // Eligibility disappearing with no explanation reads as arbitrary.
    expect(await screen.findByText('Eligibility withdrawn')).toBeInTheDocument()
    expect(screen.getByText('no longer following on LinkedIn')).toBeInTheDocument()
    expect(screen.getByText(/submit new screenshots to become eligible/i)).toBeInTheDocument()
  })

  it('stops asking for proof once approved', async () => {
    mockGetSocialFollowStatus.mockResolvedValue({
      platforms: ['linkedin', 'x'],
      submitted: true,
      status: 'approved',
      eligible: true,
    })
    renderWithProviders(<RewardsTab />)

    expect(await screen.findByText('Eligible')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit both for review/i })).not.toBeInTheDocument()
  })

  it('shows an error state and does not crash when loading fails', async () => {
    mockGetSocialFollowStatus.mockRejectedValueOnce(new Error('network error'))
    renderWithProviders(<RewardsTab />)
    await waitFor(() => expect(mockGetSocialFollowStatus).toHaveBeenCalled())
    expect(await screen.findByText(/Couldn't load your social follow status/i)).toBeInTheDocument()
  })
})
