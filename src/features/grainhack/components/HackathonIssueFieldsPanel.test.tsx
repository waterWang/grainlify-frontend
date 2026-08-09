import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { HackathonIssueFieldsPanel } from './HackathonIssueFieldsPanel'

const mockGetHackathonIssue = vi.fn()
const mockUpdateHackathonIssueFields = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonIssue: (...args: unknown[]) => mockGetHackathonIssue(...args),
  updateHackathonIssueFields: (...args: unknown[]) => mockUpdateHackathonIssueFields(...args),
}))

const PENDING_ISSUE = {
  id: 'hi-1',
  hackathon_id: 'hack-1',
  hackathon_name: 'GrainHack Spring 2026',
  project_id: 'proj-1',
  issue_number: 42,
  org_login: 'acme',
  status: 'pending' as const,
  acceptance_criteria: '',
  difficulty_tier: 'standard',
  primary_language: 'TypeScript',
  flagged_for_admin: false,
  flagged_reason: null,
  synced_at: new Date().toISOString(),
  published_at: null,
}

describe('HackathonIssueFieldsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders nothing for a plain issue that is not part of any GrainHack (getHackathonIssue 404s)', async () => {
    mockGetHackathonIssue.mockRejectedValue(new Error('not_found'))

    const { container } = renderWithProviders(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />)

    await waitFor(() => expect(mockGetHackathonIssue).toHaveBeenCalledWith('proj-1', 42))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows the hackathon banner and flags missing required fields when found', async () => {
    mockGetHackathonIssue.mockResolvedValue(PENDING_ISSUE)

    renderWithProviders(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('GrainHack: GrainHack Spring 2026')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('Missing before this publishes')).toBeInTheDocument()
    // "Acceptance criteria" appears twice once it's listed as missing: the
    // checklist item plus the form field's own label below it.
    expect(screen.getAllByText('Acceptance criteria')).toHaveLength(2)
    // Difficulty tier is pre-filled in this fixture, so only its form label
    // renders - it's never flagged as missing alongside acceptance criteria.
    expect(screen.getAllByText('Difficulty tier')).toHaveLength(1)
  })

  it('shows "ready to publish" once both required fields are already filled', async () => {
    mockGetHackathonIssue.mockResolvedValue({ ...PENDING_ISSUE, acceptance_criteria: 'Tests pass and docs updated.' })

    renderWithProviders(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('Ready - save to publish')).toBeInTheDocument()
  })

  it('hides the missing-fields checklist entirely once the issue is published', async () => {
    mockGetHackathonIssue.mockResolvedValue({
      ...PENDING_ISSUE,
      status: 'published',
      acceptance_criteria: 'Tests pass and docs updated.',
      published_at: new Date().toISOString(),
    })

    renderWithProviders(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />)

    expect(await screen.findByText('published')).toBeInTheDocument()
    expect(screen.queryByText('Missing before this publishes')).not.toBeInTheDocument()
  })

  it('saving sends the current field values and reflects a resulting status change', async () => {
    mockGetHackathonIssue.mockResolvedValue(PENDING_ISSUE)
    mockUpdateHackathonIssueFields.mockResolvedValue({
      ...PENDING_ISSUE,
      status: 'published',
      acceptance_criteria: 'Tests pass and docs updated.',
      published_at: new Date().toISOString(),
    })
    const user = userEvent.setup()

    renderWithProviders(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />)
    await screen.findByText('GrainHack: GrainHack Spring 2026')

    await user.type(
      screen.getByPlaceholderText('What must be true for a PR to satisfy this issue?'),
      'Tests pass and docs updated.',
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mockUpdateHackathonIssueFields).toHaveBeenCalledWith('proj-1', 42, {
        acceptance_criteria: 'Tests pass and docs updated.',
        difficulty_tier: 'standard',
        primary_language: 'TypeScript',
      }),
    )
    expect(await screen.findByText('published')).toBeInTheDocument()
  })

  it('re-fetches independently when projectId/issueNumber change (switching selected issues)', async () => {
    mockGetHackathonIssue.mockResolvedValueOnce(PENDING_ISSUE)
    mockGetHackathonIssue.mockRejectedValueOnce(new Error('not_found'))

    const { rerender, container } = renderWithProviders(
      <HackathonIssueFieldsPanel projectId="proj-1" issueNumber={42} />,
    )
    expect(await screen.findByText('GrainHack: GrainHack Spring 2026')).toBeInTheDocument()

    rerender(<HackathonIssueFieldsPanel projectId="proj-1" issueNumber={99} />)

    await waitFor(() => expect(mockGetHackathonIssue).toHaveBeenCalledWith('proj-1', 99))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
