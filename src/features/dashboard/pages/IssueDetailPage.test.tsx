import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { IssueDetailPage } from './IssueDetailPage'
import { getMyProjects, getPublicProject } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getMyProjects: vi.fn(),
  getPublicProject: vi.fn(),
}))

// See ProjectDetailPage.test.tsx for why a blanket Proxy-based lucide-react
// mock breaks under this repo's installed Vitest (it gets misdetected as a
// thenable). Stub only the icon IssueDetailPage actually imports.
vi.mock('lucide-react', () => ({
  ArrowLeft: () => null,
}))

vi.mock('../../../shared/components/IssueCardSkeleton', () => ({
  IssueCardSkeleton: () => <div data-testid="issue-card-skeleton" />,
}))

// IssuesTab is a large component covered by its own test slice elsewhere;
// stub it and record the props it receives so we can assert on the values
// IssueDetailPage derives/passes down without depending on its internals.
vi.mock('../../maintainers/components/issues/IssuesTab', () => ({
  IssuesTab: (props: any) => <div data-testid="issues-tab" data-props={JSON.stringify(props)} />,
}))

type PublicProject = Awaited<ReturnType<typeof getPublicProject>>
type MyProjectsList = Awaited<ReturnType<typeof getMyProjects>>
type MyProject = MyProjectsList[number]

function buildPublicProject(overrides: Partial<PublicProject> = {}): PublicProject {
  return {
    id: 'p1',
    github_full_name: 'acme/widget',
    language: 'TypeScript',
    tags: [],
    category: null,
    stars_count: 0,
    forks_count: 0,
    contributors_count: 0,
    open_issues_count: 0,
    open_prs_count: 0,
    ecosystem_name: null,
    ecosystem_slug: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    languages: [],
    ...overrides,
  }
}

function buildMyProject(overrides: Partial<MyProject> = {}): MyProject {
  return {
    id: 'p2',
    github_full_name: 'acme/other',
    github_repo_id: 999,
    status: 'verified',
    ecosystem_name: 'Acme Ecosystem',
    language: 'TypeScript',
    tags: [],
    category: 'Tooling',
    verification_error: null,
    verified_at: null,
    webhook_created_at: null,
    webhook_id: null,
    webhook_url: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function getIssuesTabProps(): any {
  const el = screen.getByTestId('issues-tab')
  return JSON.parse(el.getAttribute('data-props') || '{}')
}

describe('IssueDetailPage', () => {
  beforeEach(() => {
    vi.mocked(getPublicProject).mockResolvedValue(buildPublicProject())
    vi.mocked(getMyProjects).mockResolvedValue([])
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows 6 IssueCardSkeleton placeholders while loading', () => {
    // Never-resolving promises keep the component in its initial isLoading
    // state deterministically, independent of microtask flush timing.
    vi.mocked(getPublicProject).mockReturnValue(new Promise<PublicProject>(() => {}))
    vi.mocked(getMyProjects).mockReturnValue(new Promise<MyProjectsList>(() => {}))

    renderWithProviders(<IssueDetailPage projectId="p1" onClose={vi.fn()} />)

    expect(screen.getAllByTestId('issue-card-skeleton')).toHaveLength(6)
    expect(screen.queryByTestId('issues-tab')).not.toBeInTheDocument()
  })

  it('passes the derived initialSelectedIssueId/initialSelectedProjectId/viewMode to IssuesTab', async () => {
    renderWithProviders(<IssueDetailPage issueId="issue-1" projectId="p1" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())

    const props = getIssuesTabProps()
    expect(props.initialSelectedIssueId).toBe('issue-1')
    expect(props.initialSelectedProjectId).toBe('p1')
    expect(props.viewMode).toBe('contributor')
  })

  it('passes viewMode="maintainer" when the current project is one of myProjects', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(buildPublicProject({ id: 'p1' }))
    vi.mocked(getMyProjects).mockResolvedValue([buildMyProject({ id: 'p1' })])

    renderWithProviders(<IssueDetailPage projectId="p1" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())
    expect(getIssuesTabProps().viewMode).toBe('maintainer')
  })

  it('passes viewMode="contributor" when the current project is not owned, even with other myProjects', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(buildPublicProject({ id: 'p1' }))
    vi.mocked(getMyProjects).mockResolvedValue([buildMyProject({ id: 'p2' })])

    renderWithProviders(<IssueDetailPage projectId="p1" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())
    expect(getIssuesTabProps().viewMode).toBe('contributor')
  })

  it('passes viewMode="maintainer" for an admin viewer regardless of ownership', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(buildPublicProject({ id: 'p1' }))
    vi.mocked(getMyProjects).mockResolvedValue([])

    renderWithProviders(<IssueDetailPage projectId="p1" onClose={vi.fn()} userRole="admin" />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())
    expect(getIssuesTabProps().viewMode).toBe('maintainer')
  })

  it('de-duplicates the current project so it appears exactly once, ordered first, in selectedProjects', async () => {
    vi.mocked(getPublicProject).mockResolvedValue(
      buildPublicProject({ id: 'p1', github_full_name: 'acme/current' })
    )
    vi.mocked(getMyProjects).mockResolvedValue([
      buildMyProject({ id: 'p1', github_full_name: 'acme/current-stale', status: 'pending' }),
      buildMyProject({ id: 'p2', github_full_name: 'acme/other' }),
    ])

    renderWithProviders(<IssueDetailPage projectId="p1" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())

    const props = getIssuesTabProps()
    const p1Entries = props.selectedProjects.filter((p: any) => p.id === 'p1')
    expect(p1Entries).toHaveLength(1)
    expect(props.selectedProjects.map((p: any) => p.id)).toEqual(['p1', 'p2'])
    // The de-duplicated entry is built from the fetched project, not the
    // (possibly stale) "my projects" entry with the same id.
    expect(props.selectedProjects[0].github_full_name).toBe('acme/current')
    expect(props.selectedProjects[0].status).toBe('verified')
  })

  it('omits a current-project entry and only passes myProjects when no projectId is provided', async () => {
    vi.mocked(getMyProjects).mockResolvedValue([buildMyProject({ id: 'p2', github_full_name: 'acme/other' })])

    renderWithProviders(<IssueDetailPage onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())

    expect(getPublicProject).not.toHaveBeenCalled()
    const props = getIssuesTabProps()
    expect(props.selectedProjects).toEqual([{ id: 'p2', github_full_name: 'acme/other', status: 'verified' }])
  })

  it('calls onClose when the back button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<IssueDetailPage projectId="p1" onClose={onClose} />)

    await user.click(screen.getByText('Back'))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(getMyProjects).toHaveBeenCalled())
  })

  it('does not crash when fetches fail', async () => {
    // IssueDetailPage's load() has only try/finally (no catch), so a
    // rejection here surfaces as an unhandled rejection after finally runs
    // (unlike ProjectDetailPage, which fully catches its fetch errors).
    // Neutralize the process-level listener for the duration of this test
    // so the expected rejection doesn't fail the run, then restore it.
    const existingListeners = process.listeners('unhandledRejection')
    process.removeAllListeners('unhandledRejection')
    process.on('unhandledRejection', () => {})

    try {
      vi.mocked(getPublicProject).mockRejectedValue(new Error('network error'))

      const onClose = vi.fn()
      renderWithProviders(<IssueDetailPage projectId="p1" onClose={onClose} />)

      await waitFor(() => expect(getPublicProject).toHaveBeenCalledWith('p1'))
      // finally still runs, so isLoading flips to false and IssuesTab renders
      // (with an empty selectedProjects, since project/myProjects never got set).
      await waitFor(() => expect(screen.getByTestId('issues-tab')).toBeInTheDocument())

      expect(screen.getByText('Back')).toBeInTheDocument()
      const user = userEvent.setup()
      await user.click(screen.getByText('Back'))
      expect(onClose).toHaveBeenCalledTimes(1)
    } finally {
      process.removeAllListeners('unhandledRejection')
      for (const listener of existingListeners) {
        process.on('unhandledRejection', listener as NodeJS.UnhandledRejectionListener)
      }
    }
  })
})
