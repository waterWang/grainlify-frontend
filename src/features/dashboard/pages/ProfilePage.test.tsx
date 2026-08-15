import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { ProfilePage } from './ProfilePage'
import {
  getUserProfile,
  getPublicProfile,
  getProjectsContributed,
  getProjectsLed,
  getProfileCalendar,
  getProfileActivity,
} from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getUserProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  getProjectsContributed: vi.fn(),
  getProjectsLed: vi.fn(),
  getProfileCalendar: vi.fn(),
  getProfileActivity: vi.fn(),
}))

// ProfilePage unconditionally calls useAuth() (for the own-profile avatar/login
// fallback), which throws outside an AuthProvider. Mock the hook directly
// rather than rendering the real AuthProvider, matching the pattern already
// used in Dashboard.test.tsx for the same reason.
vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    userRole: 'contributor',
    userId: 'me-1',
    user: {
      id: 'me-1',
      role: 'contributor',
      github: { login: 'myself', avatar_url: 'https://gh.example/myself.png' },
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('lucide-react', () => ({
  Search: () => null,
  Award: () => null,
  GitPullRequest: () => null,
  FolderGit2: () => null,
  Trophy: () => null,
  Github: () => null,
  Code: () => null,
  Globe: () => null,
  Sparkles: () => null,
  Star: () => null,
  Users: () => null,
  GitFork: () => null,
  DollarSign: () => null,
  GitMerge: () => null,
  Calendar: () => null,
  ChevronRight: () => null,
  Circle: () => null,
  Eye: () => null,
  Crown: () => null,
  Link: () => null,
  ArrowLeft: () => null,
  Medal: () => null,
  Shield: () => null,
}))

type UserProfileResponse = Awaited<ReturnType<typeof getUserProfile>>
type PublicProfileResponse = Awaited<ReturnType<typeof getPublicProfile>>
type ProjectsResponse = Awaited<ReturnType<typeof getProjectsContributed>>
type CalendarResponse = Awaited<ReturnType<typeof getProfileCalendar>>
type ActivityResponse = Awaited<ReturnType<typeof getProfileActivity>>

// NOTE: getUserProfile's real response shape (used for your OWN profile) has
// no bio/website/social fields at all - only getPublicProfile (used when
// viewing someone else) carries those. That's a real asymmetry in client.ts,
// not a test simplification; see the "other identity" test below for bio.
const OWN_PROFILE: UserProfileResponse = {
  contributions_count: 99,
  projects_contributed_to_count: 2,
  projects_led_count: 1,
  rewards_count: 5,
  languages: [{ language: 'TypeScript', contribution_count: 10 }],
  ecosystems: [{ ecosystem_name: 'Stellar', contribution_count: 8 }],
  kyc_verified: true,
  rank: { position: 3, tier: 'gold', tier_name: 'Gold', tier_color: '#c9983a' },
}

const OTHER_PROFILE: PublicProfileResponse = {
  login: 'octocat',
  user_id: 'user-99',
  avatar_url: 'https://gh.example/octocat.png',
  contributions_count: 7,
  projects_contributed_to_count: 1,
  projects_led_count: 0,
  languages: [],
  ecosystems: [],
  bio: 'Building the future, one PR at a time.',
  rank: { position: null, tier: 'bronze', tier_name: 'Bronze', tier_color: '#999999' },
}

const PROJECTS: ProjectsResponse = [
  {
    id: 'proj-1',
    github_full_name: 'acme/widgets',
    status: 'active',
    ecosystem_name: 'Stellar',
    language: 'TypeScript',
  },
  { id: 'proj-2', github_full_name: 'acme/gears', status: 'active' },
]

const EMPTY_CALENDAR: CalendarResponse = { calendar: [], total: 0 }

const ACTIVITY_WITH_OPEN_ISSUE: ActivityResponse = {
  activities: [
    {
      type: 'issue',
      id: 'issue-1',
      number: 42,
      title: 'Fix the flaky test',
      url: 'https://github.com/acme/widgets/issues/42',
      state: 'open',
      date: '2026-01-15',
      month_year: 'January 2026',
      project_name: 'widgets',
      project_id: 'proj-1',
    },
  ],
  total: 1,
  limit: 100,
  offset: 0,
}

function mockHappyPath() {
  vi.mocked(getUserProfile).mockResolvedValue(OWN_PROFILE)
  vi.mocked(getPublicProfile).mockResolvedValue(OTHER_PROFILE)
  vi.mocked(getProjectsContributed).mockResolvedValue(PROJECTS)
  vi.mocked(getProjectsLed).mockResolvedValue([])
  vi.mocked(getProfileCalendar).mockResolvedValue(EMPTY_CALENDAR)
  vi.mocked(getProfileActivity).mockResolvedValue(ACTIVITY_WITH_OPEN_ISSUE)
}

describe('ProfilePage', () => {
  beforeEach(() => {
    mockHappyPath()
    // The component logs every fetch failure via console.error - keep the
    // failure-path tests' output clean without hiding real assertion failures.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders its own profile via getUserProfile (not getPublicProfile) when no viewingUserId/Login is given', async () => {
    renderWithProviders(<ProfilePage />)

    await waitFor(() => expect(getUserProfile).toHaveBeenCalledTimes(1))
    expect(getPublicProfile).not.toHaveBeenCalled()
    // Own-identity fetches carry no user id/login.
    expect(getProjectsContributed).toHaveBeenCalledWith(undefined, undefined)
    expect(getProjectsLed).toHaveBeenCalledWith(undefined, undefined)
    expect(getProfileCalendar).toHaveBeenCalledWith(undefined, undefined)
    expect(getProfileActivity).toHaveBeenCalledWith(100, 0, undefined, undefined)

    expect(await screen.findByText('myself')).toBeInTheDocument()
  })

  it('shows a loading state before the profile fetch resolves', () => {
    vi.mocked(getUserProfile).mockReturnValue(new Promise<UserProfileResponse>(() => {}))
    const { container } = renderWithProviders(<ProfilePage />)

    // The Contributions stat (number + label) is entirely skeleton-gated;
    // the label itself doesn't render until isLoadingProfile is false.
    expect(screen.queryByText('Contributions')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)
  })

  it('does not crash when every fetch fails', async () => {
    vi.mocked(getUserProfile).mockRejectedValue(new Error('network error'))
    vi.mocked(getProjectsContributed).mockRejectedValue(new Error('network error'))
    vi.mocked(getProjectsLed).mockRejectedValue(new Error('network error'))
    vi.mocked(getProfileCalendar).mockRejectedValue(new Error('network error'))
    vi.mocked(getProfileActivity).mockRejectedValue(new Error('network error'))

    renderWithProviders(<ProfilePage />)

    await waitFor(() => expect(getUserProfile).toHaveBeenCalled())
    expect(await screen.findByText('No projects contributed yet')).toBeInTheDocument()
    expect(screen.getByText('No contributions yet')).toBeInTheDocument()
  })

  it('fetches and displays the OTHER identity when viewingUserId is set, not "me"', async () => {
    renderWithProviders(<ProfilePage viewingUserId="user-99" />)

    await waitFor(() => expect(getPublicProfile).toHaveBeenCalledWith('user-99', undefined))
    expect(getUserProfile).not.toHaveBeenCalled()
    expect(getProjectsContributed).toHaveBeenCalledWith('user-99', undefined)
    expect(getProjectsLed).toHaveBeenCalledWith('user-99', undefined)
    expect(getProfileCalendar).toHaveBeenCalledWith('user-99', undefined)
    expect(getProfileActivity).toHaveBeenCalledWith(100, 0, 'user-99', undefined)

    expect(await screen.findByText('octocat')).toBeInTheDocument()
    expect(screen.getByText('Building the future, one PR at a time.')).toBeInTheDocument()
    expect(screen.queryByText('myself')).not.toBeInTheDocument()
  })

  it('fetches the OTHER identity when viewingUserLogin is set instead of viewingUserId', async () => {
    renderWithProviders(<ProfilePage viewingUserLogin="octocat" />)

    await waitFor(() => expect(getPublicProfile).toHaveBeenCalledWith(undefined, 'octocat'))
    expect(getUserProfile).not.toHaveBeenCalled()
    expect(getProjectsContributed).toHaveBeenCalledWith(undefined, 'octocat')

    expect(await screen.findByText('octocat')).toBeInTheDocument()
  })

  it('shows a Back button when viewing another user, and calls onBack when clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderWithProviders(<ProfilePage viewingUserId="user-99" onBack={onBack} />)

    const backButton = await screen.findByText('Back to Leaderboard')
    await user.click(backButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('does not show a Back button for your own profile, even when onBack is provided', async () => {
    renderWithProviders(<ProfilePage onBack={vi.fn()} />)
    await waitFor(() => expect(getUserProfile).toHaveBeenCalled())
    expect(screen.queryByText('Back to Leaderboard')).not.toBeInTheDocument()
  })

  it('clicking a listed project calls onProjectClick with its id', async () => {
    const user = userEvent.setup()
    const onProjectClick = vi.fn()
    renderWithProviders(<ProfilePage onProjectClick={onProjectClick} />)

    const projectCard = await screen.findByText('widgets')
    await user.click(projectCard)

    expect(onProjectClick).toHaveBeenCalledWith('proj-1')
  })

  it('clicking a listed open issue calls onIssueClick with the issue id and project id', async () => {
    const user = userEvent.setup()
    const onIssueClick = vi.fn()
    renderWithProviders(<ProfilePage onIssueClick={onIssueClick} />)

    const issueTitle = await screen.findByText('Fix the flaky test')
    await user.click(issueTitle)

    expect(onIssueClick).toHaveBeenCalledTimes(1)
    expect(onIssueClick).toHaveBeenCalledWith('issue-1', 'proj-1')
  })

  it('renders without crashing in light theme', () => {
    renderWithProviders(<ProfilePage />, { theme: 'light' })
    expect(screen.getByText('Projects led / Most')).toBeInTheDocument()
  })

  it('renders without crashing in dark theme', () => {
    renderWithProviders(<ProfilePage />, { theme: 'dark' })
    expect(screen.getByText('Projects led / Most')).toBeInTheDocument()
  })

  // Regression coverage for a dark-mode-only contrast bug: the rank badge
  // number, the "Unranked" fallback, and the contribution-calendar legend
  // all used to render a fixed, unthemed color that was legible in light
  // mode but nearly invisible against the dark background.
  describe('dark mode contrast', () => {
    // These two used to assert a per-theme gradient on the rank number and a
    // per-theme colour on the Unranked fallback. Both assumptions are gone:
    // the badge is now an OPAQUE gold card that is identical in both themes,
    // so its text colours are theme-independent by construction rather than by
    // a pair of conditionals that had to be kept in step.
    //
    // The rank number is also no longer bg-clip-text. Gradient-clipped text has
    // a transparent computed colour and cannot be contrast-audited at all - it
    // was the "unmeasurable" case in the landing audit, and it sat on the one
    // element that most needs to be readable.
    //
    // Contrast is now asserted by measurement rather than by class name; see
    // RankBadgeCard.tsx for the ratios (6.95 primary, 4.80 secondary, both
    // themes). What remains worth pinning here is that the profile still
    // renders the badge and that Unranked still carries its season qualifier.
    it('renders the rank badge card in both themes', async () => {
      const { container: darkContainer } = renderWithProviders(<ProfilePage />, { theme: 'dark' })
      await waitFor(() => expect(getUserProfile).toHaveBeenCalled())
      expect(darkContainer.querySelector('[data-testid="rank-badge-card"]')).toBeTruthy()
      // The unmeasurable gradient text must not come back.
      expect(darkContainer.querySelector('.bg-clip-text')).toBeNull()

      const { container: lightContainer } = renderWithProviders(<ProfilePage />, { theme: 'light' })
      await waitFor(() => expect(getUserProfile).toHaveBeenCalled())
      expect(lightContainer.querySelector('[data-testid="rank-badge-card"]')).toBeTruthy()
    })

    it('qualifies the Unranked state with the season it refers to', async () => {
      vi.mocked(getUserProfile).mockResolvedValue({
        ...OWN_PROFILE,
        rank: { position: null, tier: 'bronze', tier_name: 'Bronze', tier_color: '#999999' },
      })

      renderWithProviders(<ProfilePage />, { theme: 'dark' })

      // A bare "Unranked" reads as "you don't count"; the qualifier makes it a
      // statement about a 90-day window instead.
      const unranked = await screen.findByTestId('rank-unranked')
      expect(unranked.textContent).toContain('Unranked')
      expect(unranked.textContent).toContain('this season')
    })

    it('the calendar Less/More legend switches to a light color in dark mode', async () => {
      renderWithProviders(<ProfilePage />, { theme: 'dark' })

      const less = await screen.findByText('Less')
      const more = screen.getByText('More')
      expect(less.className).toContain('text-[#d4d4d4]')
      expect(more.className).toContain('text-[#d4d4d4]')
      expect(less.className).not.toContain('text-[#7a6b5a]')
    })
  })
})
