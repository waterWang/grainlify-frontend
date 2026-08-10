import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { AppealsReview } from './AppealsReview'

const mockGetHackathonAppeals = vi.fn()
const mockDecideHackathonAppeal = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonAppeals: (...args: unknown[]) => mockGetHackathonAppeals(...args),
  decideHackathonAppeal: (...args: unknown[]) => mockDecideHackathonAppeal(...args),
  overrideHackathonVerdict: vi.fn(),
}))

const verdict = {
  id: 'v-1',
  hackathon_id: 'hack-1',
  hackathon_issue_id: null,
  project_id: 'proj-1',
  repo_full_name: 'acme/widgets',
  pr_number: 12,
  issue_number: 7,
  github_login: 'octocat',
  prefilter_status: 'passed',
  prefilter_reason: null,
  diff_stats: null,
  duplicate_of_verdict_id: null,
  duplicate_similarity: null,
  duplicate_flagged: false,
  judge_bucket: 'accepted',
  judge_confidence: 'high',
  judge_payload: { criteria: [], reasoning: 'ok' },
  judge_model: 'claude-sonnet-5',
  cross_check_bucket: null,
  cross_check_payload: null,
  cross_check_model: null,
  escalation_bucket: null,
  escalation_payload: null,
  needs_human_review: false,
  review_reason: null,
  final_bucket: 'accepted',
  final_source: 'auto_confirmed',
  overridden_by: null,
  override_reason: null,
  overridden_at: null,
  units: 1,
  payout_amount: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  merge_commit_sha: 'abc123',
}

const pendingAppeal = {
  id: 'appeal-1',
  verdict_id: 'v-1',
  github_login: 'octocat',
  reason: 'the added tests were not counted',
  status: 'pending' as const,
  decision_reason: null,
  decided_bucket: null,
  decided_at: null,
  created_at: new Date().toISOString(),
  verdict,
}

const openWindow = {
  days: 7,
  opens_at: new Date().toISOString(),
  closes_at: new Date(Date.now() + 5 * 86400_000).toISOString(),
  open: true,
  closed_out_at: null,
}

describe('AppealsReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('surfaces the appellant grounds and says the event cannot settle while any are pending', async () => {
    mockGetHackathonAppeals.mockResolvedValue({ appeals: [pendingAppeal], appeal_window: openWindow })

    renderWithProviders(<AppealsReview hackathonId="hack-1" />)

    await waitFor(() =>
      expect(screen.getByText(/the added tests were not counted/)).toBeInTheDocument(),
    )
    expect(screen.getByText(/1 appeal awaiting a decision/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing pays out, until each of these has an answer/i)).toBeInTheDocument()
  })

  it('will not record a decision without a written reason', async () => {
    const user = userEvent.setup()
    mockGetHackathonAppeals.mockResolvedValue({ appeals: [pendingAppeal], appeal_window: openWindow })

    renderWithProviders(<AppealsReview hackathonId="hack-1" />)

    await user.click(await screen.findByRole('button', { name: /Decide this appeal/i }))
    expect(screen.getByRole('button', { name: /Record decision/i })).toBeDisabled()
    expect(mockDecideHackathonAppeal).not.toHaveBeenCalled()
  })

  it('records an upheld decision with the new bucket and the reason', async () => {
    const user = userEvent.setup()
    mockGetHackathonAppeals.mockResolvedValue({ appeals: [pendingAppeal], appeal_window: openWindow })
    mockDecideHackathonAppeal.mockResolvedValue({ ok: true })

    renderWithProviders(<AppealsReview hackathonId="hack-1" />)

    await user.click(await screen.findByRole('button', { name: /Decide this appeal/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'substantial')
    await user.type(screen.getByRole('textbox'), 'checked login_test.go, it does cover the branch')
    await user.click(screen.getByRole('button', { name: /Record decision/i }))

    await waitFor(() =>
      expect(mockDecideHackathonAppeal).toHaveBeenCalledWith(
        'appeal-1',
        true,
        'checked login_test.go, it does cover the branch',
        'substantial',
      ),
    )
  })

  it('warns that changing a bucket redivides the pool for everyone', async () => {
    const user = userEvent.setup()
    mockGetHackathonAppeals.mockResolvedValue({ appeals: [pendingAppeal], appeal_window: openWindow })

    renderWithProviders(<AppealsReview hackathonId="hack-1" />)

    await user.click(await screen.findByRole('button', { name: /Decide this appeal/i }))
    await user.selectOptions(screen.getByRole('combobox'), 'exceptional')

    expect(screen.getByText(/every contributor's share is\s+recomputed once/i)).toBeInTheDocument()
  })

  it('reports when the window has been closed out and payouts recomputed', async () => {
    mockGetHackathonAppeals.mockResolvedValue({
      appeals: [],
      appeal_window: { ...openWindow, open: false, closed_out_at: new Date().toISOString() },
    })

    renderWithProviders(<AppealsReview hackathonId="hack-1" />)

    await waitFor(() =>
      expect(screen.getByText(/Appeal window closed and payouts recomputed/i)).toBeInTheDocument(),
    )
  })
})
