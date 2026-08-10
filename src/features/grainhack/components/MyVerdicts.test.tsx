import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { MyVerdicts } from './MyVerdicts'

const mockGetMyGrainHackVerdicts = vi.fn()
const mockAppealVerdict = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getMyGrainHackVerdicts: (...args: unknown[]) => mockGetMyGrainHackVerdicts(...args),
  appealVerdict: (...args: unknown[]) => mockAppealVerdict(...args),
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
  judge_payload: {
    criteria: [
      { text: 'Validates the email field', met: true, evidence: 'src/auth/Login.tsx:44 adds a regex check' },
      { text: 'Adds a regression test', met: false, evidence: '' },
    ],
    reasoning: 'Small but correct change.',
  },
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

describe('MyVerdicts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the full record: criteria, whether each was met, and the bucket', async () => {
    mockGetMyGrainHackVerdicts.mockResolvedValue({
      verdicts: [{ verdict, phase: 'results_published' }],
    })

    renderWithProviders(<MyVerdicts />)

    await waitFor(() => expect(screen.getByText(/Validates the email field/)).toBeInTheDocument())
    expect(screen.getByText(/Adds a regression test/)).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText(/Small but correct change/)).toBeInTheDocument()
  })

  it('links each citation into the diff at that line, so an appeal can be checked', async () => {
    mockGetMyGrainHackVerdicts.mockResolvedValue({
      verdicts: [{ verdict, phase: 'results_published' }],
    })

    renderWithProviders(<MyVerdicts />)

    const link = await screen.findByRole('link', { name: /src\/auth\/Login\.tsx:44/ })
    expect(link).toHaveAttribute('href', expect.stringContaining('acme/widgets'))
    expect(link).toHaveAttribute('href', expect.stringContaining('abc123'))
  })

  it('refuses to submit an appeal with no stated grounds', async () => {
    const user = userEvent.setup()
    mockGetMyGrainHackVerdicts.mockResolvedValue({
      verdicts: [{ verdict, phase: 'results_published' }],
    })

    renderWithProviders(<MyVerdicts />)

    await user.click(await screen.findByRole('button', { name: /Appeal this result/i }))
    const submit = screen.getByRole('button', { name: /Submit appeal/i })
    expect(submit).toBeDisabled()
    expect(mockAppealVerdict).not.toHaveBeenCalled()
  })

  it('submits an appeal with the written reason', async () => {
    const user = userEvent.setup()
    mockGetMyGrainHackVerdicts.mockResolvedValue({
      verdicts: [{ verdict, phase: 'results_published' }],
    })
    mockAppealVerdict.mockResolvedValue({ id: 'appeal-1' })

    renderWithProviders(<MyVerdicts />)

    await user.click(await screen.findByRole('button', { name: /Appeal this result/i }))
    await user.type(screen.getByRole('textbox'), 'the regression test is in login_test.go')
    await user.click(screen.getByRole('button', { name: /Submit appeal/i }))

    await waitFor(() =>
      expect(mockAppealVerdict).toHaveBeenCalledWith('v-1', 'the regression test is in login_test.go'),
    )
  })

  it('shows the reviewer decision once an appeal has been answered, and offers no second appeal', async () => {
    mockGetMyGrainHackVerdicts.mockResolvedValue({
      verdicts: [
        {
          verdict,
          phase: 'settled',
          appeal: {
            id: 'appeal-1',
            verdict_id: 'v-1',
            github_login: 'octocat',
            reason: 'the tests were not counted',
            status: 'upheld',
            decision_reason: 'confirmed, login_test.go covers the new branch',
            decided_bucket: 'substantial',
            decided_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        },
      ],
    })

    renderWithProviders(<MyVerdicts />)

    await waitFor(() => expect(screen.getByText(/Appeal upheld/i)).toBeInTheDocument())
    expect(screen.getByText(/confirmed, login_test\.go covers the new branch/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Appeal this result/i })).not.toBeInTheDocument()
  })

  it('explains the empty state rather than showing a blank panel', async () => {
    mockGetMyGrainHackVerdicts.mockResolvedValue({ verdicts: [] })

    renderWithProviders(<MyVerdicts />)

    await waitFor(() => expect(screen.getByText(/No results yet/i)).toBeInTheDocument())
    expect(screen.getByText(/appeal window opens at the same time/i)).toBeInTheDocument()
  })
})
