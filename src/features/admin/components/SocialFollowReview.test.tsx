import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { SocialFollowReview } from './SocialFollowReview'

const mockGetAdminSocialFollowSubmissions = vi.fn()
const mockApproveSocialFollowSubmission = vi.fn()
const mockRejectSocialFollowSubmission = vi.fn()
const mockRevokeSocialFollowSubmission = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminSocialFollowSubmissions: (...args: unknown[]) => mockGetAdminSocialFollowSubmissions(...args),
  approveSocialFollowSubmission: (...args: unknown[]) => mockApproveSocialFollowSubmission(...args),
  rejectSocialFollowSubmission: (...args: unknown[]) => mockRejectSocialFollowSubmission(...args),
  revokeSocialFollowSubmission: (...args: unknown[]) => mockRevokeSocialFollowSubmission(...args),
}))

const PENDING = {
  id: 'sub-1',
  user_id: 'user-1',
  github_login: 'octocat',
  linkedin_screenshot: 'data:image/png;base64,linkedin',
  x_screenshot: 'data:image/png;base64,xproof',
  status: 'pending' as const,
  created_at: new Date().toISOString(),
}

const APPROVED = { ...PENDING, id: 'sub-2', status: 'approved' as const }

describe('SocialFollowReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAdminSocialFollowSubmissions.mockResolvedValue({ submissions: [PENDING] })
    mockApproveSocialFollowSubmission.mockResolvedValue({ ok: true })
    mockRejectSocialFollowSubmission.mockResolvedValue({ ok: true })
    mockRevokeSocialFollowSubmission.mockResolvedValue({ ok: true })
  })

  it('shows both screenshots so one decision covers both platforms', async () => {
    renderWithProviders(<SocialFollowReview />)
    await waitFor(() => expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending'))

    // Judging one platform without the other in view is half a decision -
    // which is exactly what the atomic submission model removes.
    expect(await screen.findByAltText('LinkedIn follow proof')).toHaveAttribute(
      'src',
      'data:image/png;base64,linkedin',
    )
    expect(screen.getByAltText('X follow proof')).toHaveAttribute('src', 'data:image/png;base64,xproof')
    expect(screen.getByText('octocat')).toBeInTheDocument()
  })

  it('approving applies to the whole submission', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SocialFollowReview />)
    await user.click(await screen.findByRole('button', { name: /approve both/i }))
    await waitFor(() => expect(mockApproveSocialFollowSubmission).toHaveBeenCalledWith('sub-1'))
  })

  it('rejection requires a reason before the API is called', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SocialFollowReview />)
    await user.click(await screen.findByRole('button', { name: /^reject$/i }))

    // The reason is shown to the contributor, so a decision without one is
    // not a usable decision.
    const confirm = screen.getByRole('button', { name: 'Confirm rejection' })
    expect(confirm).toBeDisabled()
    expect(mockRejectSocialFollowSubmission).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox'), 'screenshot does not show your account')
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    await waitFor(() =>
      expect(mockRejectSocialFollowSubmission).toHaveBeenCalledWith('sub-1', 'screenshot does not show your account'),
    )
  })

  it('offers revocation only on an approved submission, and requires a reason', async () => {
    mockGetAdminSocialFollowSubmissions.mockResolvedValue({ submissions: [APPROVED] })
    const user = userEvent.setup()
    renderWithProviders(<SocialFollowReview />)

    // Nothing to approve or reject on something already decided.
    expect(await screen.findByRole('button', { name: /revoke eligibility/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve both/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /revoke eligibility/i }))
    expect(screen.getByRole('button', { name: 'Confirm revocation' })).toBeDisabled()

    await user.type(screen.getByRole('textbox'), 'no longer following on LinkedIn')
    await user.click(screen.getByRole('button', { name: 'Confirm revocation' }))
    await waitFor(() =>
      expect(mockRevokeSocialFollowSubmission).toHaveBeenCalledWith('sub-2', 'no longer following on LinkedIn'),
    )
  })

  it('a pending submission offers no revoke button', async () => {
    renderWithProviders(<SocialFollowReview />)
    await screen.findByRole('button', { name: /approve both/i })
    // The API refuses it, and offering it here invites a misclick on the
    // wrong row.
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument()
  })

  it('shows an empty state when the queue is clear', async () => {
    mockGetAdminSocialFollowSubmissions.mockResolvedValue({ submissions: [] })
    renderWithProviders(<SocialFollowReview />)
    expect(await screen.findByText('Nothing here.')).toBeInTheDocument()
  })
})
