import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ContributionsTab } from './ContributionsTab'

const mockGetMyIssueApplications = vi.fn()

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/api/client')>('../../../shared/api/client')
  return {
    ...actual,
    getMyIssueApplications: (...args: unknown[]) => mockGetMyIssueApplications(...args),
  }
})

const mockToastError = vi.fn()
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: (...args: unknown[]) => mockToastError(...args) } }))

const ITEMS = [
  {
    id: 'a1',
    status: 'applied' as const,
    project_id: 'p1',
    project_name: 'grainlify/example-repo',
    issue_number: 101,
    issue_title: 'Applied issue title',
    issue_url: 'https://github.com/grainlify/example-repo/issues/101',
    labels: ['good first issue'],
    applied_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    status: 'assigned' as const,
    project_id: 'p1',
    project_name: 'grainlify/example-repo',
    issue_number: 102,
    issue_title: 'Assigned issue title',
    issue_url: 'https://github.com/grainlify/example-repo/issues/102',
    labels: [] as string[],
    assigned_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'a3',
    status: 'pending_review' as const,
    project_id: 'p1',
    project_name: 'grainlify/example-repo',
    issue_number: 103,
    issue_title: 'Pending review issue title',
    issue_url: 'https://github.com/grainlify/example-repo/issues/103',
    pr_url: 'https://github.com/grainlify/example-repo/pull/9',
    labels: ['feature'],
    assigned_at: '2026-01-03T00:00:00Z',
    pr_created_at: '2026-01-04T00:00:00Z',
  },
  {
    id: 'a4',
    status: 'complete' as const,
    project_id: 'p1',
    project_name: 'grainlify/example-repo',
    issue_number: 104,
    issue_title: 'Complete issue title',
    issue_url: 'https://github.com/grainlify/example-repo/issues/104',
    pr_url: 'https://github.com/grainlify/example-repo/pull/10',
    labels: ['bug'],
    assigned_at: '2026-01-05T00:00:00Z',
    pr_merged_at: '2026-01-06T00:00:00Z',
  },
]

describe('ContributionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeletons before data arrives, then replaces them', async () => {
    let resolveFetch: (v: unknown) => void = () => {}
    mockGetMyIssueApplications.mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve }),
    )
    renderWithProviders(<ContributionsTab />)

    expect(screen.queryByText('Applied issue title')).not.toBeInTheDocument()
    expect(screen.queryByText('No applications yet')).not.toBeInTheDocument()

    resolveFetch({ issue_applications: [] })
    await waitFor(() => {
      expect(screen.getAllByText('No applications yet').length).toBeGreaterThan(0)
    })
  })

  it('buckets a populated response into all four columns with real content', async () => {
    mockGetMyIssueApplications.mockResolvedValue({ issue_applications: ITEMS })
    renderWithProviders(<ContributionsTab />)

    expect((await screen.findAllByText('Applied issue title')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Assigned issue title').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending review issue title').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Complete issue title').length).toBeGreaterThan(0)

    // Tag pills reflect each item's first label.
    expect(screen.getAllByText('good first issue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    expect(screen.getAllByText('bug').length).toBeGreaterThan(0)

    // "See application"/"See detail" link to the real GitHub URL - the PR
    // when one's been matched (pending_review/complete), else the issue.
    const links = screen.getAllByRole('link') as HTMLAnchorElement[]
    const hrefs = links.map((a) => a.href)
    expect(hrefs).toContain('https://github.com/grainlify/example-repo/issues/101')
    expect(hrefs).toContain('https://github.com/grainlify/example-repo/pull/10')
  })

  it('shows an empty-column placeholder for a bucket with no items, without crashing', async () => {
    mockGetMyIssueApplications.mockResolvedValue({ issue_applications: [ITEMS[0]] })
    renderWithProviders(<ContributionsTab />)

    await screen.findAllByText('Applied issue title')
    // Assigned/Pending review/Complete all have zero items.
    expect(screen.getAllByText('No applications yet').length).toBeGreaterThan(0)
  })

  it('shows a toast and an empty board on fetch failure, without crashing', async () => {
    mockGetMyIssueApplications.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<ContributionsTab />)

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    expect(screen.getAllByText('No applications yet').length).toBeGreaterThan(0)
  })

  it('renders in both light and dark theme without crashing', async () => {
    mockGetMyIssueApplications.mockResolvedValue({ issue_applications: ITEMS })

    const { unmount } = renderWithProviders(<ContributionsTab />, { theme: 'light' })
    expect((await screen.findAllByText('Applied issue title')).length).toBeGreaterThan(0)
    unmount()

    renderWithProviders(<ContributionsTab />, { theme: 'dark' })
    expect((await screen.findAllByText('Applied issue title')).length).toBeGreaterThan(0)
  })
})
