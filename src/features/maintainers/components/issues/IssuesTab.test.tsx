import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { IssuesTab } from './IssuesTab'
import { getProjectIssues, assignApplicant } from '../../../../shared/api/client'

function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-spy">{location.search}</div>
}

// Regression coverage for URL-persisting the selected issue within Maintainers
// (see Dashboard.tsx / MaintainersPage.tsx for the sibling ?tab=/?subtab= fixes) -
// nothing else tracks which issue in this list is open, so without this it's
// lost on reload. Only the pieces IssuesTab actually touches are mocked.
vi.mock('../../../../shared/api/client', () => ({
  getProjectIssues: vi.fn(),
  applyToIssue: vi.fn(),
  postBotComment: vi.fn(),
  withdrawApplication: vi.fn(),
  assignApplicant: vi.fn(),
  unassignApplicant: vi.fn(),
  rejectApplication: vi.fn(),
}))

vi.mock('../../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ userRole: 'maintainer', user: { github: { login: 'octocat' } } }),
}))

// GrainHack fields are an independent, separately-tested concern (see
// HackathonIssueFieldsPanel.test.tsx) - stub it here so this file doesn't
// also need to carry a getHackathonIssue mock for every test.
vi.mock('../../../grainhack/components/HackathonIssueFieldsPanel', () => ({
  HackathonIssueFieldsPanel: () => null,
}))
vi.mock('../../../grainhack/components/ApplyToIssuePanel', () => ({
  ApplyToIssuePanel: () => null,
}))

const mockedGetProjectIssues = vi.mocked(getProjectIssues)

const PROJECT = { id: 'proj-1', github_full_name: 'acme/widgets', status: 'verified' }

function makeApiIssue(overrides: Partial<Awaited<ReturnType<typeof getProjectIssues>>['issues'][number]> & { github_issue_id: number }) {
  return {
    number: overrides.github_issue_id,
    state: 'open',
    title: `Issue ${overrides.github_issue_id}`,
    description: null,
    author_login: 'octocat',
    assignees: [],
    labels: [],
    comments_count: 0,
    comments: [],
    url: 'https://github.com/acme/widgets/issues/1',
    updated_at: '2026-01-01T00:00:00Z',
    last_seen_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('IssuesTab - selected issue URL persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetProjectIssues.mockResolvedValue({
      issues: [makeApiIssue({ github_issue_id: 101 }), makeApiIssue({ github_issue_id: 102 })],
    })
  })

  it('opens directly on the issue named by ?mIssue= after a reload', async () => {
    renderWithProviders(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} />,
      { route: '/dashboard?tab=maintainers&subtab=Issues&mIssue=102' },
    )

    // The sidebar list always stays visible alongside the detail pane, so
    // "Issue 102" legitimately appears twice (list card + detail heading) -
    // the <h1> is what uniquely proves the detail pane opened, not the list.
    expect(await screen.findByRole('heading', { level: 1, name: 'Issue 102' })).toBeInTheDocument()
  })

  it('writes ?mIssue= when an issue is clicked, and clears it when the detail pane is closed', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} />
        <LocationSpy />
      </>,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )

    await waitFor(() => expect(screen.getByText('Issue 101')).toBeInTheDocument())
    await user.click(screen.getByText('Issue 101'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Issue 101' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('location-spy').textContent).toContain('mIssue=101'))

    await user.click(screen.getByRole('button', { name: 'Close issue detail' }))

    await waitFor(() => expect(screen.getByTestId('location-spy').textContent).not.toContain('mIssue'))
    // Detail pane is gone - only the list (with both cards) remains.
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument())
    expect(screen.getByText('Issue 101')).toBeInTheDocument()
    expect(screen.getByText('Issue 102')).toBeInTheDocument()
  })
})

describe('IssuesTab - assign error messaging', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetProjectIssues.mockResolvedValue({
      issues: [
        makeApiIssue({
          github_issue_id: 201,
          comments_count: 1,
          comments: [
            {
              id: 555,
              user: { login: 'applicant-1' },
              created_at: '2026-01-01T00:00:00Z',
              // Mirrors the exact bot comment format Apply() posts (backend
              // issue_applications.go) so this matches isApplicationComment()
              // and the applicant-login regex, rendering a real application
              // card with a working Assign button, not just a discussion
              // comment.
              body: '**@applicant-1 has applied to work on this issue as part of the Grainlify program.**\n\n> I would like to help',
            },
          ],
        }),
      ],
    })
  })

  // Application cards start collapsed (expandedApplications state) - the
  // dropdown toggle is an icon-only button with no accessible name, so it
  // has to be targeted by its lucide icon class rather than role/name.
  async function expandFirstApplicationCard(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => expect(screen.getByText('Issue 201')).toBeInTheDocument())
    await user.click(screen.getByText('Issue 201'))

    const chevron = await waitFor(() => {
      const el = document.querySelector('.lucide-chevron-down')
      if (!el) throw new Error('chevron-down toggle not found yet')
      return el
    })
    await user.click(chevron.closest('button')!)
  }

  it('shows a friendly message when assigning a non-applicant is rejected by the backend', async () => {
    const user = userEvent.setup()
    vi.mocked(assignApplicant).mockRejectedValue(new Error('assignee_has_not_applied'))

    renderWithProviders(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} viewMode="maintainer" />,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )
    await expandFirstApplicationCard(user)

    const assignButton = await screen.findByRole('button', { name: 'Assign' })
    await user.click(assignButton)

    expect(await screen.findByText("This person hasn't applied to this issue on Grainlify yet.")).toBeInTheDocument()
  })

  it('shows a reconnect-GitHub message when the project\'s installation is stale', async () => {
    const user = userEvent.setup()
    vi.mocked(assignApplicant).mockRejectedValue(new Error('github_installation_not_found'))

    renderWithProviders(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} viewMode="maintainer" />,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )
    await expandFirstApplicationCard(user)

    const assignButton = await screen.findByRole('button', { name: 'Assign' })
    await user.click(assignButton)

    expect(
      await screen.findByText("This project's GitHub connection is broken. A maintainer needs to reinstall the Grainlify GitHub App to fix this.")
    ).toBeInTheDocument()
  })

  it('falls back to the raw error message for a different failure', async () => {
    const user = userEvent.setup()
    vi.mocked(assignApplicant).mockRejectedValue(new Error('installation_token_failed'))

    renderWithProviders(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} viewMode="maintainer" />,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )
    await expandFirstApplicationCard(user)

    const assignButton = await screen.findByRole('button', { name: 'Assign' })
    await user.click(assignButton)

    expect(await screen.findByText('installation_token_failed')).toBeInTheDocument()
  })
})

describe('IssuesTab - closed issue display', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a Closed badge in the header and does not claim the issue is open in the empty-applications state', async () => {
    // Regression coverage: the header only ever said "opened {time} ago"
    // with no closed indicator, and the empty-applications illustration
    // unconditionally said "This issue is open and waiting for
    // contributors to apply" - directly contradicting the separate,
    // correctly state-aware "This issue is closed. Applications are
    // disabled." message shown just above it for the same issue.
    //
    // Selected via initialSelectedIssueId (deep link), not a sidebar click:
    // the sidebar list filters to open issues by default, so a closed issue
    // doesn't appear there at all - exactly how the original report reached
    // this issue (via Dashboard's "Review" button / a persisted ?mIssue=
    // link), not by finding it in the filtered list.
    mockedGetProjectIssues.mockResolvedValue({
      issues: [makeApiIssue({ github_issue_id: 721, state: 'closed', title: 'A finished issue' })],
    })

    renderWithProviders(
      <IssuesTab
        onNavigate={vi.fn()}
        selectedProjects={[PROJECT]}
        initialSelectedIssueId="721"
        initialSelectedProjectId={PROJECT.id}
      />
    )

    expect(await screen.findByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('This issue is closed. Applications are disabled.')).toBeInTheDocument()
    expect(screen.getByText('This issue is closed, so no new applications can be submitted.')).toBeInTheDocument()
    expect(screen.queryByText(/This issue is open and waiting/)).not.toBeInTheDocument()
  })

  it('shows no Closed badge and the original waiting-for-contributors text for an open issue', async () => {
    mockedGetProjectIssues.mockResolvedValue({
      issues: [makeApiIssue({ github_issue_id: 722, state: 'open', title: 'A fresh issue' })],
    })
    const user = userEvent.setup()

    renderWithProviders(<IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} />)
    await waitFor(() => expect(screen.getByText('A fresh issue')).toBeInTheDocument())
    await user.click(screen.getByText('A fresh issue'))

    await screen.findByText(/This issue is open and waiting/)
    expect(screen.queryByText('Closed')).not.toBeInTheDocument()
  })
})
