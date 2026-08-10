import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApplyToIssuePanel } from './ApplyToIssuePanel'

const mockGetContributorHackathonIssue = vi.fn()
const mockApplyToHackathonIssue = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getContributorHackathonIssue: (...args: unknown[]) => mockGetContributorHackathonIssue(...args),
  applyToHackathonIssue: (...args: unknown[]) => mockApplyToHackathonIssue(...args),
}))

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()

const ISSUE = {
  id: 'hi-1',
  hackathon_id: 'hack-1',
  hackathon_name: 'GrainHack Spring 2026',
  project_id: 'proj-1',
  issue_number: 42,
  status: 'published' as const,
  acceptance_criteria: 'Tests pass and docs updated.',
  difficulty_tier: 'standard',
  primary_language: 'TypeScript',
  reserved: false,
  application_window_opens_at: inHours(-1),
  application_window_closes_at: inHours(5),
}

const ok = (over: Record<string, unknown> = {}) => ({
  issue: ISSUE,
  applicant_count: 3,
  my_application: null,
  ...over,
})

describe('ApplyToIssuePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders nothing for an issue that is not in a GrainHack', async () => {
    mockGetContributorHackathonIssue.mockRejectedValue(new Error('not_a_hackathon_issue'))
    const { container } = renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    await waitFor(() => expect(mockGetContributorHackathonIssue).toHaveBeenCalledWith('proj-1', 42))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows the window, applicant count and criteria, and offers to apply', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(ok())
    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('Part of GrainHack Spring 2026')).toBeInTheDocument()
    expect(screen.getByText('3 applicants')).toBeInTheDocument()
    expect(screen.getByText(/left to apply/)).toBeInTheDocument()
    expect(screen.getByText('Tests pass and docs updated.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply for this issue' })).toBeInTheDocument()
  })

  it('applying posts the optional text and refreshes', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(ok())
    mockApplyToHackathonIssue.mockResolvedValue({ id: 'app-1', status: 'applied' })
    const user = userEvent.setup()

    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)
    await screen.findByText('Part of GrainHack Spring 2026')

    await user.type(screen.getByPlaceholderText(/the draw doesn't weight this/i), 'I know this codebase')
    await user.click(screen.getByRole('button', { name: 'Apply for this issue' }))

    await waitFor(() => expect(mockApplyToHackathonIssue).toHaveBeenCalledWith('hi-1', 'I know this codebase'))
    // Refetched so the panel reflects the new state.
    await waitFor(() => expect(mockGetContributorHackathonIssue).toHaveBeenCalledTimes(2))
  })

  it('shows the specific gate reason when the contributor was rejected', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(
      ok({
        my_application: {
          id: 'app-1',
          hackathon_id: 'hack-1',
          hackathon_name: 'GrainHack Spring 2026',
          hackathon_issue_id: 'hi-1',
          project_id: 'proj-1',
          repo_full_name: 'acme/widgets',
          issue_number: 42,
          status: 'rejected_gate',
          gate_failure_reason: "You're holding 2 of 2 assignment slots. Submit a PR to free one.",
          fit: null,
          application_window_closes_at: inHours(5),
          created_at: new Date().toISOString(),
        },
      }),
    )
    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText("You can't be assigned this issue")).toBeInTheDocument()
    expect(
      screen.getByText("You're holding 2 of 2 assignment slots. Submit a PR to free one."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply for this issue' })).not.toBeInTheDocument()
  })

  it('shows an already-applied state instead of letting someone apply twice', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(
      ok({
        my_application: {
          id: 'app-1',
          hackathon_id: 'hack-1',
          hackathon_name: 'GrainHack Spring 2026',
          hackathon_issue_id: 'hi-1',
          project_id: 'proj-1',
          repo_full_name: 'acme/widgets',
          issue_number: 42,
          status: 'applied',
          gate_failure_reason: null,
          fit: 'plausible',
          application_window_closes_at: inHours(5),
          created_at: new Date().toISOString(),
        },
      }),
    )
    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText(/You've applied/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply for this issue' })).not.toBeInTheDocument()
  })

  it('does not offer to apply once the window has closed', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(
      ok({ issue: { ...ISSUE, application_window_closes_at: inHours(-1) } }),
    )
    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('Applications have closed for this issue.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply for this issue' })).not.toBeInTheDocument()
  })

  it('flags a newcomer-reserved issue, which changes whether applying is worthwhile', async () => {
    mockGetContributorHackathonIssue.mockResolvedValue(ok({ issue: { ...ISSUE, reserved: true } }))
    renderWithProviders(<ApplyToIssuePanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('Newcomers only')).toBeInTheDocument()
  })
})
