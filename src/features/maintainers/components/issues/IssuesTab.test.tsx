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
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} />,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )
    await expandFirstApplicationCard(user)

    const assignButton = await screen.findByRole('button', { name: 'Assign' })
    await user.click(assignButton)

    expect(await screen.findByText("This person hasn't applied to this issue on Grainlify yet.")).toBeInTheDocument()
  })

  it('falls back to the raw error message for a different failure', async () => {
    const user = userEvent.setup()
    vi.mocked(assignApplicant).mockRejectedValue(new Error('installation_token_failed'))

    renderWithProviders(
      <IssuesTab onNavigate={vi.fn()} selectedProjects={[PROJECT]} />,
      { route: '/dashboard?tab=maintainers&subtab=Issues' },
    )
    await expandFirstApplicationCard(user)

    const assignButton = await screen.findByRole('button', { name: 'Assign' })
    await user.click(assignButton)

    expect(await screen.findByText('installation_token_failed')).toBeInTheDocument()
  })
})
