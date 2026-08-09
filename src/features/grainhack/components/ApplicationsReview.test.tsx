import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { ApplicationsReview } from './ApplicationsReview'

const mockGetAdminHackathonApplications = vi.fn()
const mockAcceptHackathonApplication = vi.fn()
const mockRejectHackathonApplication = vi.fn()
const mockRequestMoreInfoHackathonApplication = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminHackathonApplications: (...args: unknown[]) => mockGetAdminHackathonApplications(...args),
  acceptHackathonApplication: (...args: unknown[]) => mockAcceptHackathonApplication(...args),
  rejectHackathonApplication: (...args: unknown[]) => mockRejectHackathonApplication(...args),
  requestMoreInfoHackathonApplication: (...args: unknown[]) => mockRequestMoreInfoHackathonApplication(...args),
}))

// Signals are computed lazily via their own GitHub-backed endpoint - unrelated
// to what this suite exercises (the review queue's own accept/reject/more-info
// logic) - so stub it out, matching how Dashboard.test.tsx stubs unrelated
// child pages/components it doesn't want to exercise.
vi.mock('./ApplicationSignalsPanel', () => ({
  ApplicationSignalsPanel: () => <div data-testid="signals-panel" />,
}))

const APPLICATIONS = [
  {
    id: 'app-1',
    hackathon_id: 'hack-1',
    hackathon_name: 'GrainHack Spring 2026',
    project_id: 'proj-1',
    project_full_name: 'acme/widgets',
    short_description: 'A widget factory.',
    goal: 'Ship more widgets.',
    expected_issue_count: 12,
    maintainer_contact: 'maintainer@acme.dev',
    status: 'pending' as const,
    review_reason: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  },
]

describe('ApplicationsReview', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetAdminHackathonApplications.mockResolvedValue({ applications: APPLICATIONS })
    mockAcceptHackathonApplication.mockResolvedValue({ ok: true })
    mockRejectHackathonApplication.mockResolvedValue({ ok: true })
    mockRequestMoreInfoHackathonApplication.mockResolvedValue({ ok: true })
  })

  it('loads and displays pending applications for the given hackathon', async () => {
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await waitFor(() => expect(mockGetAdminHackathonApplications).toHaveBeenCalledWith('hack-1', 'pending'))
    expect(await screen.findByText('acme/widgets')).toBeInTheDocument()
  })

  it('shows an empty state when there are no pending applications', async () => {
    mockGetAdminHackathonApplications.mockResolvedValue({ applications: [] })
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    expect(await screen.findByText('No pending applications.')).toBeInTheDocument()
  })

  it('expanding a row loads its signals panel', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets')

    await user.click(screen.getByTitle('Expand'))

    expect(await screen.findByTestId('signals-panel')).toBeInTheDocument()
    expect(screen.getByText(/Ship more widgets\./)).toBeInTheDocument()
  })

  it('accepting an application calls the API immediately, with no reason required', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets')

    await user.click(screen.getByTitle('Accept'))

    await waitFor(() => expect(mockAcceptHackathonApplication).toHaveBeenCalledWith('app-1'))
    expect(mockGetAdminHackathonApplications).toHaveBeenCalledTimes(2)
  })

  it('rejecting requires a non-empty reason: submit stays disabled until one is typed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets')

    await user.click(screen.getByTitle('Reject'))
    expect(await screen.findByText('Reject application')).toBeInTheDocument()

    // Two "Reject"-named buttons exist once the modal is open: the row's
    // icon button (accessible name from its title attribute) and the
    // modal's own submit button, which renders after it in the DOM.
    const getSubmitButton = () => {
      const buttons = screen.getAllByRole('button', { name: 'Reject' })
      return buttons[buttons.length - 1]
    }
    expect(getSubmitButton()).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/shown to the applicant/i), 'Missing maintainer contact info')
    expect(getSubmitButton()).toBeEnabled()

    await user.click(getSubmitButton())

    await waitFor(() =>
      expect(mockRejectHackathonApplication).toHaveBeenCalledWith('app-1', 'Missing maintainer contact info'),
    )
  })

  it('requesting more info requires a reason and calls the dedicated endpoint, not reject', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets')

    await user.click(screen.getByTitle('Request more info'))
    expect(await screen.findByText('Request more info')).toBeInTheDocument()

    const submitButton = screen.getByRole('button', { name: 'Request info' })
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/shown to the applicant/i), 'Please clarify your expected issue count')
    await user.click(submitButton)

    await waitFor(() =>
      expect(mockRequestMoreInfoHackathonApplication).toHaveBeenCalledWith(
        'app-1',
        'Please clarify your expected issue count',
      ),
    )
    expect(mockRejectHackathonApplication).not.toHaveBeenCalled()
  })

  it('whitespace-only reason is trimmed and still blocks submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ApplicationsReview hackathonId="hack-1" />)
    await screen.findByText('acme/widgets')

    await user.click(screen.getByTitle('Reject'))
    await user.type(screen.getByPlaceholderText(/shown to the applicant/i), '   ')

    const buttons = screen.getAllByRole('button', { name: 'Reject' })
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })
})
