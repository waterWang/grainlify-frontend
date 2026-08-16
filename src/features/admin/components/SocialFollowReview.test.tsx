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

/** The list endpoint returns a page envelope, not a bare array. Tests build it
 *  through this so a change to the envelope breaks in one place. */
const page = (
  submissions: unknown[],
  { total = submissions.length, limit = 10, offset = 0 } = {},
) => ({ submissions, total, limit, offset, has_more: offset + submissions.length < total })

describe('SocialFollowReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING]))
    mockApproveSocialFollowSubmission.mockResolvedValue({ ok: true })
    mockRejectSocialFollowSubmission.mockResolvedValue({ ok: true })
    mockRevokeSocialFollowSubmission.mockResolvedValue({ ok: true })
  })

  it('shows both screenshots so one decision covers both platforms', async () => {
    renderWithProviders(<SocialFollowReview />)
    await waitFor(() =>
      expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending', { offset: 0 }),
    )

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

  // The queue is paged because each row carries both screenshots inline -
  // around 787kB a row, so 22 pending submissions was a 17MB response that
  // grew with the backlog. The controls also have to tell the reviewer how
  // much of the queue they are NOT looking at.
  describe('paging', () => {
    it('says how much of the queue is off-screen', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      expect(await screen.findByText(/of 22/)).toBeInTheDocument()
    })

    it('hides the controls entirely when everything fits on one page', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 1, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)
      await screen.findByAltText('LinkedIn follow proof')

      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
    })

    it('steps forward by a page and asks the server for that offset', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByRole('button', { name: /next/i }))

      await waitFor(() =>
        expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending', { offset: 10 }),
      )
    })

    it('cannot page back from the first page', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      expect(await screen.findByRole('button', { name: /previous/i })).toBeDisabled()
    })

    it('cannot page past the end', async () => {
      // A genuine last page: offset 20, one row, 21 total - so 20 + 1 is not
      // less than 21 and has_more is false. Deriving has_more in the fixture
      // rather than hardcoding it keeps the test honest: an inconsistent page
      // (say 1 row at offset 20 of 22) really does have more to fetch, and
      // asserting Next was disabled there would have been asserting a bug.
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(
        page([PENDING], { total: 21, limit: 10, offset: 20 }),
      )
      renderWithProviders(<SocialFollowReview />)
      await screen.findByAltText('LinkedIn follow proof')

      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })

    it('returns to the first page when the filter changes', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByRole('button', { name: /next/i }))
      await waitFor(() =>
        expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending', { offset: 10 }),
      )

      // Keeping the offset across a filter change lands on an arbitrary slice
      // of a different queue.
      await user.click(screen.getByRole('button', { name: 'approved' }))
      await waitFor(() =>
        expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('approved', { offset: 0 }),
      )
    })

    it('stays on the current page after a decision, rather than jumping to the top', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING], { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByRole('button', { name: /next/i }))
      await waitFor(() =>
        expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending', { offset: 10 }),
      )
      mockGetAdminSocialFollowSubmissions.mockClear()

      await user.click(screen.getByRole('button', { name: /approve both/i }))

      await waitFor(() => expect(mockApproveSocialFollowSubmission).toHaveBeenCalled())
      expect(mockGetAdminSocialFollowSubmissions).toHaveBeenCalledWith('pending', { offset: 10 })
    })
  })

  // Approval grants founding-pool eligibility. The trail was always recorded;
  // it just was not readable from the review page, so a decision appeared
  // with no author.
  it('names who decided, and when', async () => {
    mockGetAdminSocialFollowSubmissions.mockResolvedValue(
      page([
        {
          ...APPROVED,
          decided_by: 'admin-uuid',
          decided_by_login: 'jagadeeshftw',
          decided_at: '2026-08-16T10:00:00Z',
        },
      ]),
    )
    renderWithProviders(<SocialFollowReview />)

    expect(await screen.findByText(/Decided by jagadeeshftw/)).toBeInTheDocument()
  })

  it('does not claim an author for an undecided submission', async () => {
    mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING]))
    renderWithProviders(<SocialFollowReview />)
    await screen.findByAltText('LinkedIn follow proof')

    expect(screen.queryByText(/Decided/)).not.toBeInTheDocument()
  })

})
