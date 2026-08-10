import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { VerdictDetail } from './VerdictDetail'
import type { HackathonVerdict } from '../../../shared/api/client'

const mockOverride = vi.fn()
vi.mock('../../../shared/api/client', () => ({
  overrideHackathonVerdict: (...args: unknown[]) => mockOverride(...args),
}))

const VERDICT: HackathonVerdict = {
  id: 'v-1',
  hackathon_id: 'h-1',
  hackathon_issue_id: 'hi-1',
  project_id: 'p-1',
  repo_full_name: 'acme/widgets',
  pr_number: 482,
  issue_number: 44,
  github_login: 'octocat',
  prefilter_status: 'passed',
  prefilter_reason: null,
  diff_stats: {
    files_changed: 4, lines_added: 120, lines_removed: 12, generated_lines: 0,
    lockfile_lines: 30, test_lines: 40, tests_added: true, touches_core_paths: true,
    meaningful_lines: 90, docs_only: false,
  },
  duplicate_of_verdict_id: null,
  duplicate_similarity: null,
  duplicate_flagged: false,
  judge_bucket: 'substantial',
  judge_confidence: 'high',
  judge_payload: {
    criteria: [
      { text: 'Form validates email format', met: true, evidence: 'src/auth/LoginForm.tsx:44-61 adds regex validation' },
      { text: 'Errors are announced to screen readers', met: false, evidence: 'No aria-live region anywhere in the diff' },
    ],
    criteria_met: 1, criteria_total: 2, scope: 'in_scope', substance: 'core_logic',
    bucket: 'substantial', confidence: 'high', concerns: [],
    reasoning: 'Rewrote retry handling in the payment worker.',
  },
  judge_model: 'claude-sonnet-5',
  cross_check_bucket: 'accepted',
  cross_check_payload: { bucket: 'accepted', criteria: [], concerns: ['evidence_contradicts_claims'] },
  cross_check_model: 'gpt-x',
  escalation_bucket: null,
  escalation_payload: null,
  needs_human_review: true,
  review_reason: 'judge and cross-check disagree',
  final_bucket: null,
  final_source: null,
  overridden_by: null,
  override_reason: null,
  overridden_at: null,
  units: null,
  payout_amount: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  merge_commit_sha: 'abc123def',
}

describe('VerdictDetail', () => {
  beforeEach(() => vi.resetAllMocks())

  it('renders each criterion with its met state', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    expect(screen.getByText('Form validates email format')).toBeInTheDocument()
    expect(screen.getByText('Errors are announced to screen readers')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 criteria met · in scope · core logic')).toBeInTheDocument()
  })

  // The requirement this whole view exists to serve: a reviewer must be able
  // to check a citation in one click, or the citation rule is decorative.
  it('turns a file:line citation into a link pinned to the merge commit', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'src/auth/LoginForm.tsx:44-61' })
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/acme/widgets/blob/abc123def/src/auth/LoginForm.tsx#L44-L61',
    )
  })

  it('offers the full diff when a criterion cites no file:line', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    const fallback = screen.getByRole('link', { name: /No file:line cited/ })
    expect(fallback).toHaveAttribute('href', 'https://github.com/acme/widgets/pull/482/files')
  })

  it('shows both model verdicts side by side so a disagreement is visible', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    expect(screen.getByText('Judge')).toBeInTheDocument()
    expect(screen.getByText('Cross-check')).toBeInTheDocument()
    expect(screen.getByText('substantial')).toBeInTheDocument()
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText('high confidence')).toBeInTheDocument()
    expect(screen.getByText('evidence contradicts claims')).toBeInTheDocument()
  })

  it('shows diff stats and labels them as computed in code', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    expect(screen.getByText(/computed in code, not by the model/)).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument() // meaningful lines
    expect(screen.getByText('tests added')).toBeInTheDocument()
  })

  it('says plainly when the event is in shadow mode', () => {
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)
    expect(screen.getByText(/Nothing here has been shown to the contributor/)).toBeInTheDocument()
  })

  it('explains a pre-filter rejection instead of showing an empty verdict', () => {
    renderWithProviders(
      <VerdictDetail
        verdict={{ ...VERDICT, prefilter_status: 'rejected', prefilter_reason: 'CI was failing at merge.', judge_payload: null, judge_bucket: null }}
        shadowMode
        onOverridden={vi.fn()}
      />,
    )
    expect(screen.getByText('Rejected before judging')).toBeInTheDocument()
    expect(screen.getByText('CI was failing at merge.')).toBeInTheDocument()
  })

  it('frames a duplicate flag as review, not rejection', () => {
    renderWithProviders(
      <VerdictDetail
        verdict={{ ...VERDICT, duplicate_flagged: true, duplicate_similarity: 0.94 }}
        shadowMode
        onOverridden={vi.fn()}
      />,
    )
    expect(screen.getByText(/94% similar/)).toBeInTheDocument()
    expect(screen.getByText(/for review, not rejection/)).toBeInTheDocument()
  })

  // §5.7: an override with no written reason is a calibration example with
  // no label, which is worth nothing later.
  it('requires a written reason before an override can be saved', async () => {
    const user = userEvent.setup()
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Set verdict' }))
    expect(await screen.findByText('Set the final verdict')).toBeInTheDocument()

    const save = screen.getByRole('button', { name: 'Save verdict' })
    expect(save).toBeDisabled()
    expect(mockOverride).not.toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText(/What did the model get wrong/), 'Cross-check was right; the retry path is routine.')
    expect(save).toBeEnabled()
  })

  it('saves an override with its bucket and reason, then refreshes', async () => {
    mockOverride.mockResolvedValue({ ok: true, final_bucket: 'accepted' })
    const onOverridden = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<VerdictDetail verdict={VERDICT} shadowMode onOverridden={onOverridden} />)

    await user.click(screen.getByRole('button', { name: 'Set verdict' }))
    await user.type(screen.getByPlaceholderText(/What did the model get wrong/), 'Routine, not core logic.')
    await user.click(screen.getByRole('button', { name: 'Save verdict' }))

    await waitFor(() =>
      expect(mockOverride).toHaveBeenCalledWith('v-1', 'substantial', 'Routine, not core logic.'),
    )
    await waitFor(() => expect(onOverridden).toHaveBeenCalled())
  })

  it('shows why a previous override was made', () => {
    renderWithProviders(
      <VerdictDetail
        verdict={{ ...VERDICT, final_bucket: 'accepted', final_source: 'human_override', override_reason: 'Scope was narrower than the judge read it.' }}
        shadowMode
        onOverridden={vi.fn()}
      />,
    )
    expect(screen.getByText('human override')).toBeInTheDocument()
    expect(screen.getByText('Scope was narrower than the judge read it.')).toBeInTheDocument()
  })
})
