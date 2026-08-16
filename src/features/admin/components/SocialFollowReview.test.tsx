import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { SocialFollowReview } from './SocialFollowReview'

const mockGetAdminSocialFollowSubmissions = vi.fn()
const mockGetSocialFollowReasonCodes = vi.fn()
const mockApproveSocialFollowSubmission = vi.fn()
const mockBulkApproveSocialFollowSubmissions = vi.fn()
const mockRejectSocialFollowSubmission = vi.fn()
const mockRevokeSocialFollowSubmission = vi.fn()

const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: Object.assign((m: string) => toastError(m), {
    error: (m: string) => toastError(m),
    success: vi.fn(),
  }),
}))

vi.mock('../../../shared/api/client', () => ({
  getAdminSocialFollowSubmissions: (...args: unknown[]) => mockGetAdminSocialFollowSubmissions(...args),
  getSocialFollowReasonCodes: (...args: unknown[]) => mockGetSocialFollowReasonCodes(...args),
  approveSocialFollowSubmission: (...args: unknown[]) => mockApproveSocialFollowSubmission(...args),
  bulkApproveSocialFollowSubmissions: (...args: unknown[]) => mockBulkApproveSocialFollowSubmissions(...args),
  rejectSocialFollowSubmission: (...args: unknown[]) => mockRejectSocialFollowSubmission(...args),
  revokeSocialFollowSubmission: (...args: unknown[]) => mockRevokeSocialFollowSubmission(...args),
}))

/** The codes come from the server, so the picker has no copy of its own. */
const REASON_CODES = [
  { code: 'x_no_follow', label: "X proof doesn't show a follow", needs_note: false },
  { code: 'linkedin_no_follow', label: "LinkedIn proof doesn't show a follow", needs_note: false },
  { code: 'unreadable', label: 'Screenshot unreadable or wrong image', needs_note: false },
  { code: 'wrong_account', label: 'Wrong account followed', needs_note: false },
  { code: 'duplicate', label: 'Duplicate submission', needs_note: false },
  { code: 'other', label: 'Other', needs_note: true },
]

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
    toastError.mockReset()
    mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING]))
    mockGetSocialFollowReasonCodes.mockResolvedValue({ reason_codes: REASON_CODES })
    mockBulkApproveSocialFollowSubmissions.mockResolvedValue({
      approved: [{ id: 'sub-1' }],
      skipped: [],
      failed: [],
      approved_count: 1,
      skipped_count: 0,
      failed_count: 0,
    })
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
    // not a usable decision. A note alone is no longer enough either: the
    // category is what makes rejections countable.
    const confirm = await screen.findByRole('button', { name: 'Confirm rejection' })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByRole('textbox'), 'screenshot does not show your account')
    expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled()
    expect(mockRejectSocialFollowSubmission).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: /X proof doesn't show a follow/i }))
    await user.click(screen.getByRole('button', { name: 'Confirm rejection' }))
    await waitFor(() =>
      expect(mockRejectSocialFollowSubmission).toHaveBeenCalledWith('sub-1', {
        reasonCode: 'x_no_follow',
        note: 'screenshot does not show your account',
      }),
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

      // Specific: the selection bar also mentions the total, and a loose
      // matcher would pass on either while proving neither.
      expect(await screen.findByText(/Showing 1.1 of 22/)).toBeInTheDocument()
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
    mockGetSocialFollowReasonCodes.mockResolvedValue({ reason_codes: REASON_CODES })
    mockBulkApproveSocialFollowSubmissions.mockResolvedValue({
      approved: [{ id: 'sub-1' }],
      skipped: [],
      failed: [],
      approved_count: 1,
      skipped_count: 0,
      failed_count: 0,
    })
    renderWithProviders(<SocialFollowReview />)
    await screen.findByAltText('LinkedIn follow proof')

    expect(screen.queryByText(/Decided/)).not.toBeInTheDocument()
  })


  // Approving grants Founding Contributor Pool eligibility, so the controls
  // here have to be literally true about what they act on.
  describe('bulk selection', () => {
    const TWO = [PENDING, { ...PENDING, id: 'sub-2', github_login: 'hubot' }]

    it('selects only the rows on this page, never the whole queue', async () => {
      const user = userEvent.setup()
      // 2 on screen, 22 pending in total - the gap is the thing that must not
      // be silently swept in.
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO, { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))
      await user.click(screen.getByRole('button', { name: /approve selected/i }))

      // The confirmation counts what is on screen, not the queue.
      expect(await screen.findByRole('button', { name: 'Approve 2' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Approve 2' }))
      await waitFor(() => expect(mockBulkApproveSocialFollowSubmissions).toHaveBeenCalled())
      expect(mockBulkApproveSocialFollowSubmissions).toHaveBeenCalledWith(['sub-1', 'sub-2'])
    })

    it('labels the control as page-scoped and says how many are pending here', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO, { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      // The label has to say "this page" because that is what it does - a
      // safeguard that reads as protective while doing nothing is worse than
      // none, since it stops anyone looking closer.
      expect(await screen.findByText(/select all on this page/i)).toBeInTheDocument()
      expect(screen.getByText(/2 pending here of 22/)).toBeInTheDocument()
    })

    it('the confirmation states the count before anything happens', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select sub-1|select octocat/i))
      await user.click(screen.getByRole('button', { name: /approve selected/i }))

      expect(await screen.findByRole('button', { name: 'Approve 1' })).toBeInTheDocument()
      expect(mockBulkApproveSocialFollowSubmissions).not.toHaveBeenCalled()
    })

    it('clears the selection when the page changes, so nothing unseen is carried over', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO, { total: 22, limit: 10 }))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))
      expect(screen.getByRole('button', { name: /approve selected \(2\)/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /next/i }))

      // A tick means "I looked at this". The next page is different rows.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /approve selected$/i })).toBeDisabled(),
      )
    })


    // Found by mutation testing: every other fixture here has an all-pending
    // page, so swapping `selectablePending` for `submissions` in select-all
    // changed nothing and the mutation passed. On a mixed page it matters -
    // ticking a decided row inflates the count in the confirmation and offers
    // an action that cannot apply to it.
    it('select-all skips rows that are already decided', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(
        page([PENDING, APPROVED, { ...PENDING, id: 'sub-3', status: 'rejected' as const }], {
          total: 3,
        }),
      )
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))

      // One pending row of three, so the count is 1 - not 3.
      expect(screen.getByRole('button', { name: /approve selected \(1\)/i })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /approve selected/i }))
      await user.click(await screen.findByRole('button', { name: /^Approve 1$/ }))
      await waitFor(() => expect(mockBulkApproveSocialFollowSubmissions).toHaveBeenCalled())
      expect(mockBulkApproveSocialFollowSubmissions).toHaveBeenCalledWith(['sub-1'])
    })

    it('shows a checkbox only on rows that can be approved', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([PENDING, APPROVED]))
      renderWithProviders(<SocialFollowReview />)
      await screen.findByText('Select all on this page')

      // One per pending row, plus the select-all itself.
      expect(screen.getAllByRole('checkbox')).toHaveLength(2)
    })

    it('offers no bulk control on a queue with nothing pending', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page([APPROVED]))
      renderWithProviders(<SocialFollowReview />)
      await screen.findByAltText('LinkedIn follow proof')

      expect(screen.queryByLabelText(/select all on this page/i)).not.toBeInTheDocument()
    })

    // The reporting requirement: never a bare "done".
    it('reports approved, skipped and failed separately', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO))
      mockBulkApproveSocialFollowSubmissions.mockResolvedValue({
        approved: [{ id: 'sub-1' }],
        skipped: [{ id: 'sub-2', reason: 'not_pending', current_status: 'approved' }],
        failed: [{ id: 'sub-3' }],
        approved_count: 17,
        skipped_count: 3,
        failed_count: 2,
      })
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))
      await user.click(screen.getByRole('button', { name: /approve selected/i }))
      await user.click(await screen.findByRole('button', { name: /^Approve 2$/ }))

      await waitFor(() => expect(toastError).toHaveBeenCalled())
      // Three separate facts. A skip is the queue moving under the reviewer;
      // a failure is something wrong. Collapsing them sends somebody hunting
      // a bug that isn't there.
      expect(toastError.mock.calls[0][0]).toMatch(/17 approved/)
      expect(toastError.mock.calls[0][0]).toMatch(/3 skipped/)
      expect(toastError.mock.calls[0][0]).toMatch(/2 failed/)
    })

    it('keeps failures selected so they can be retried', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO))
      mockBulkApproveSocialFollowSubmissions.mockResolvedValue({
        approved: [{ id: 'sub-1' }],
        skipped: [],
        failed: [{ id: 'sub-2' }],
        approved_count: 1,
        skipped_count: 0,
        failed_count: 1,
      })
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))
      await user.click(screen.getByRole('button', { name: /approve selected/i }))
      await user.click(await screen.findByRole('button', { name: /^Approve 2$/ }))

      // One failed, so exactly one stays ticked.
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /approve selected \(1\)/i })).toBeInTheDocument(),
      )
    })

    it('changes nothing and keeps the selection when the whole request fails', async () => {
      const user = userEvent.setup()
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(page(TWO))
      mockBulkApproveSocialFollowSubmissions.mockRejectedValue(new Error('network down'))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByLabelText(/select all on this page/i))
      await user.click(screen.getByRole('button', { name: /approve selected/i }))
      await user.click(await screen.findByRole('button', { name: /^Approve 2$/ }))

      await waitFor(() => expect(toastError).toHaveBeenCalled())
      expect(screen.getByRole('button', { name: /approve selected \(2\)/i })).toBeInTheDocument()
    })
  })

  describe('rejection reasons', () => {
    it('requires a note for "Other" and not for the others', async () => {
      const user = userEvent.setup()
      renderWithProviders(<SocialFollowReview />)
      await user.click(await screen.findByRole('button', { name: /^reject$/i }))

      // A code that names the problem stands on its own.
      await user.click(await screen.findByRole('radio', { name: /Duplicate submission/i }))
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeEnabled()

      // "Other" says nothing, so without a note the contributor is told their
      // proof failed for "Other" - which reads as an answer.
      await user.click(screen.getByRole('radio', { name: /^Other$/i }))
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled()

      await user.type(screen.getByRole('textbox'), 'the account in both shots is different')
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeEnabled()
    })

    it('takes the reason list from the server rather than defining its own', async () => {
      renderWithProviders(<SocialFollowReview />)
      await waitFor(() => expect(mockGetSocialFollowReasonCodes).toHaveBeenCalled())
    })

    it('still allows a note-only rejection when the reason list cannot be loaded', async () => {
      // Non-fatal: better to review with a free-text note than not at all.
      const user = userEvent.setup()
      mockGetSocialFollowReasonCodes.mockRejectedValue(new Error('nope'))
      renderWithProviders(<SocialFollowReview />)

      await user.click(await screen.findByRole('button', { name: /^reject$/i }))
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()

      await user.type(screen.getByRole('textbox'), 'free text fallback')
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeEnabled()
    })

    it('shows the resolved label on a decided row, not the raw code', async () => {
      mockGetAdminSocialFollowSubmissions.mockResolvedValue(
        page([
          {
            ...PENDING,
            status: 'rejected' as const,
            reason_code: 'unreadable',
            reason_label: 'Screenshot unreadable or wrong image',
            decision_reason: 'the second one is a profile page',
          },
        ]),
      )
      renderWithProviders(<SocialFollowReview />)

      expect(await screen.findByText(/Screenshot unreadable or wrong image/)).toBeInTheDocument()
      expect(screen.queryByText(/unreadable$/)).not.toBeInTheDocument()
    })
  })

})
