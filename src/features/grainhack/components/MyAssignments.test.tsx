import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { MyAssignments } from './MyAssignments'

const mockGetMyHackathonAssignments = vi.fn()
const mockReleaseHackathonAssignment = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getMyHackathonAssignments: (...args: unknown[]) => mockGetMyHackathonAssignments(...args),
  releaseHackathonAssignment: (...args: unknown[]) => mockReleaseHackathonAssignment(...args),
}))

const base = {
  id: 'asg-1',
  hackathon_id: 'hack-1',
  hackathon_name: 'GrainHack Spring 2026',
  hackathon_issue_id: 'hi-1',
  repo_full_name: 'acme/widgets',
  issue_number: 42,
  github_login: 'octocat',
  status: 'active' as const,
  holds_slot: true,
  assigned_at: new Date(Date.now() - 3600_000).toISOString(),
  stale_at: new Date(Date.now() + 4 * 24 * 3600_000).toISOString(),
  release_reason: null,
  abandon_recorded: false,
  qualifying_pr_number: null,
}

describe('MyAssignments', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty state', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({ assignments: [] })
    renderWithProviders(<MyAssignments />)
    expect(await screen.findByText("You don't have any GrainHack assignments yet.")).toBeInTheDocument()
  })

  it('shows the slot indicator and the stale deadline for an open assignment', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({ assignments: [base] })
    renderWithProviders(<MyAssignments />)

    expect(await screen.findByText('acme/widgets#42')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Using a slot')).toBeInTheDocument()
    expect(screen.getByText(/Submit a PR within .* or this is released/)).toBeInTheDocument()
  })

  it('shows the PR link and no stale timer once a qualifying PR exists', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({
      assignments: [{ ...base, status: 'pr_submitted', holds_slot: false, stale_at: null, qualifying_pr_number: 77 }],
    })
    renderWithProviders(<MyAssignments />)

    expect(await screen.findByText('PR #77')).toBeInTheDocument()
    expect(screen.getByText('PR submitted')).toBeInTheDocument()
    // The slot frees at submission by default, so the badge must be gone.
    expect(screen.queryByText('Using a slot')).not.toBeInTheDocument()
    // Review latency must not threaten the assignment.
    expect(screen.queryByText(/or this is released/)).not.toBeInTheDocument()
  })

  it('explains a stale release and that it counted as an abandon', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({
      assignments: [
        {
          ...base,
          status: 'released_stale',
          holds_slot: false,
          stale_at: null,
          abandon_recorded: true,
          release_reason: 'no qualifying PR before the stale deadline',
        },
      ],
    })
    renderWithProviders(<MyAssignments />)

    expect(await screen.findByText('Released - timed out')).toBeInTheDocument()
    expect(screen.getByText(/counted as an abandon/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Give this back' })).not.toBeInTheDocument()
  })

  it('releasing asks for confirmation first, then reports whether it cost an abandon', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({ assignments: [base] })
    mockReleaseHackathonAssignment.mockResolvedValue({ ok: true, abandon_recorded: false })
    const user = userEvent.setup()

    renderWithProviders(<MyAssignments />)
    await screen.findByText('acme/widgets#42')

    await user.click(screen.getByRole('button', { name: 'Give this back' }))
    expect(await screen.findByText('Give this assignment back?')).toBeInTheDocument()
    // Nothing sent until confirmed.
    expect(mockReleaseHackathonAssignment).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Give it back' }))
    await waitFor(() => expect(mockReleaseHackathonAssignment).toHaveBeenCalledWith('asg-1'))
    // Refetched so the list reflects the release.
    await waitFor(() => expect(mockGetMyHackathonAssignments).toHaveBeenCalledTimes(2))
  })

  it('cancelling the release modal sends nothing', async () => {
    mockGetMyHackathonAssignments.mockResolvedValue({ assignments: [base] })
    const user = userEvent.setup()

    renderWithProviders(<MyAssignments />)
    await screen.findByText('acme/widgets#42')

    await user.click(screen.getByRole('button', { name: 'Give this back' }))
    await user.click(await screen.findByRole('button', { name: 'Keep it' }))

    expect(mockReleaseHackathonAssignment).not.toHaveBeenCalled()
  })
})
