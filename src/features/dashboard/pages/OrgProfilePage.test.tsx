import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { OrgProfilePage } from './OrgProfilePage'
import {
  getOrgSummary,
  getOrgActivity,
  getOrgCalendar,
  getOrgLinks,
  updateOrgLinks,
  getOrgRatings,
  getMyOrgRatingStatus,
  getMyProjects,
  submitOrgRating,
  getPublicProjects,
} from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  getOrgSummary: vi.fn(),
  getOrgActivity: vi.fn(),
  getOrgCalendar: vi.fn(),
  getOrgLinks: vi.fn(),
  updateOrgLinks: vi.fn(),
  getOrgRatings: vi.fn(),
  getMyOrgRatingStatus: vi.fn(),
  getMyProjects: vi.fn(),
  submitOrgRating: vi.fn(),
  getPublicProjects: vi.fn(),
}))

// recharts' <ResponsiveContainer> measures real layout (0 in jsdom) - stubbed
// out per DataPage.test.tsx's established pattern so OrgActivityChart
// renders hermetically instead of at 0x0.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  BarChart: ({ children }: any) => children,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

// isAuthenticated is read directly to decide whether to fetch "my rating
// status" at all - mutable so individual tests can flip it, matching the
// pattern ProfilePage.test.tsx uses for the same hook.
let mockIsAuthenticated = true
vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}))

const mockedGetOrgSummary = vi.mocked(getOrgSummary)
const mockedGetOrgActivity = vi.mocked(getOrgActivity)
const mockedGetOrgCalendar = vi.mocked(getOrgCalendar)
const mockedGetOrgLinks = vi.mocked(getOrgLinks)
const mockedUpdateOrgLinks = vi.mocked(updateOrgLinks)
const mockedGetMyProjects = vi.mocked(getMyProjects)
const mockedGetOrgRatings = vi.mocked(getOrgRatings)
const mockedGetMyOrgRatingStatus = vi.mocked(getMyOrgRatingStatus)
const mockedSubmitOrgRating = vi.mocked(submitOrgRating)
const mockedGetPublicProjects = vi.mocked(getPublicProjects)

type OrgSummaryResponse = Awaited<ReturnType<typeof getOrgSummary>>

const SUMMARY: OrgSummaryResponse = {
  login: 'acme',
  avatar_url: 'https://gh.example/acme.png',
  repo_count: 4,
  stars_count: 250,
  contributors_count: 12,
  merged_prs_count: 30,
  rank_position: 3,
  rank_tier: 'gold',
  rank_tier_name: 'Gold',
  rank_tier_color: '#c9983a',
  average_rating: 4.5,
  ratings_count: 2,
}

const RATINGS = {
  ratings: [
    {
      rating: 5,
      comment: 'Great maintainers, fast reviews.',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      display_name: 'Ada Lovelace',
      avatar_url: 'https://gh.example/ada.png',
      github_login: 'ada',
    },
  ],
  total: 1,
}

type PublicProjectsResponse = Awaited<ReturnType<typeof getPublicProjects>>
type ApiProject = PublicProjectsResponse['projects'][number]

function makeApiProject(overrides: Partial<ApiProject> & Pick<ApiProject, 'id' | 'github_full_name'>): ApiProject {
  return {
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
    description: '',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

// Repo under the org being viewed, plus one under an unrelated org - proves
// the client-side filter in OrgProfilePage only shows the viewed org's repos.
const ACME_REPO = makeApiProject({ id: 'repo-1', github_full_name: 'acme/widget-kit', description: 'A great widget kit' })
const OTHER_REPO = makeApiProject({ id: 'repo-2', github_full_name: 'globex/other-repo' })

function mockHappyPath() {
  mockedGetOrgSummary.mockResolvedValue(SUMMARY)
  mockedGetOrgActivity.mockResolvedValue({ weeks: [] })
  mockedGetOrgCalendar.mockResolvedValue({ calendar: [], total: 0 })
  mockedGetOrgLinks.mockResolvedValue({ telegram: null, linkedin: null, whatsapp: null, twitter: null, discord: null })
  mockedUpdateOrgLinks.mockResolvedValue({ ok: true })
  mockedGetMyProjects.mockResolvedValue([])
  mockedGetOrgRatings.mockResolvedValue(RATINGS)
  mockedGetMyOrgRatingStatus.mockResolvedValue({ eligible: false, rating: null })
  mockedGetPublicProjects.mockResolvedValue({ projects: [ACME_REPO, OTHER_REPO], total: 2, limit: 200, offset: 0 })
}

describe('OrgProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockIsAuthenticated = true
    mockHappyPath()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('fetches and displays the org summary, stats, and rank', async () => {
    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

    expect(await screen.findByRole('heading', { name: 'acme' })).toBeInTheDocument()
    expect(mockedGetOrgSummary).toHaveBeenCalledWith('acme')
    expect(screen.getByText('4')).toBeInTheDocument() // repo_count
    expect(screen.getByText('250')).toBeInTheDocument() // stars_count
    expect(screen.getByText('12')).toBeInTheDocument() // contributors_count
    expect(screen.getByText('30')).toBeInTheDocument() // merged_prs_count
    expect(screen.getByText('Gold')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // rank position
  })

  // Activity chart coverage removed along with the section itself (disabled
  // "for now" per explicit request, 2026-08-09) - OrgActivityChart.tsx and
  // its backend endpoint are untouched, so this is a quick re-add, not a
  // rebuild, if/when the section comes back.

  it('shows the reviews list with reviewer name, rating, and comment', async () => {
    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Great maintainers, fast reviews.')).toBeInTheDocument()
    expect(mockedGetOrgRatings).toHaveBeenCalledWith('acme', { limit: 10, offset: 0 })
  })

  it('shows a 404-style message when the org does not exist', async () => {
    mockedGetOrgSummary.mockRejectedValue(new Error('org_not_found'))

    renderWithProviders(<OrgProfilePage viewingOrgLogin="no-such-org" />)

    expect(await screen.findByText(/Couldn't find an organization/i)).toBeInTheDocument()
  })

  describe('review CTA states', () => {
    it('shows an ineligible explanation when the user has no merged PR in this org', async () => {
      mockedGetMyOrgRatingStatus.mockResolvedValue({ eligible: false, rating: null })

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

      expect(await screen.findByText(/Get a pull request merged into acme/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /write a review/i })).not.toBeInTheDocument()
    })

    it('shows a Write a review button when eligible and unrated, opening RatingModal on click', async () => {
      mockedGetMyOrgRatingStatus.mockResolvedValue({ eligible: true, rating: null })
      const user = userEvent.setup()

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

      const writeButton = await screen.findByRole('button', { name: /write a review/i })
      await user.click(writeButton)

      expect(screen.getByText('Rate this organization')).toBeInTheDocument()
    })

    it('shows an Edit your review button when the user already has a rating', async () => {
      mockedGetMyOrgRatingStatus.mockResolvedValue({
        eligible: true,
        rating: { rating: 4, comment: 'Solid', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      })
      const user = userEvent.setup()

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

      const editButton = await screen.findByRole('button', { name: /edit your review/i })
      await user.click(editButton)

      // The CTA button (still in the DOM behind the modal) and the modal's
      // own title both read "Edit your review" - target the modal heading
      // specifically to prove the modal actually opened.
      expect(screen.getByRole('heading', { name: 'Edit your review' })).toBeInTheDocument()
    })

    it('does not fetch rating status and treats the user as ineligible when not authenticated', async () => {
      mockIsAuthenticated = false

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

      await waitFor(() => expect(mockedGetOrgSummary).toHaveBeenCalled())
      expect(mockedGetMyOrgRatingStatus).not.toHaveBeenCalled()
      expect(await screen.findByText(/Get a pull request merged into acme/i)).toBeInTheDocument()
    })
  })

  it('submitting a review calls submitOrgRating and refreshes the summary and ratings list', async () => {
    mockedGetMyOrgRatingStatus.mockResolvedValue({ eligible: true, rating: null })
    mockedSubmitOrgRating.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

    await user.click(await screen.findByRole('button', { name: /write a review/i }))
    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(mockedSubmitOrgRating).toHaveBeenCalledWith('acme', { rating: 5, comment: undefined })
    })
    // Modal closes and the summary/ratings refetch.
    await waitFor(() => expect(mockedGetOrgSummary).toHaveBeenCalledTimes(2))
    expect(mockedGetOrgRatings).toHaveBeenCalledTimes(2)
  })

  it('calls onBack when the Back button is clicked', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" onBack={onBack} />)
    await screen.findByRole('heading', { name: 'acme' })

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows the org\'s own repos inline (not repos from other orgs), and calls onProjectClick when one is clicked', async () => {
    const onProjectClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" onProjectClick={onProjectClick} />)

    expect(await screen.findByText('widget-kit')).toBeInTheDocument()
    expect(screen.getByText('A great widget kit')).toBeInTheDocument()
    // globex/other-repo belongs to a different org - must not appear here.
    expect(screen.queryByText('other-repo')).not.toBeInTheDocument()
    expect(mockedGetPublicProjects).toHaveBeenCalledWith({ limit: 200 })

    await user.click(screen.getByText('widget-kit'))
    expect(onProjectClick).toHaveBeenCalledWith('repo-1')
  })

  it('shows an empty state when the org has no public repos', async () => {
    mockedGetPublicProjects.mockResolvedValue({ projects: [OTHER_REPO], total: 1, limit: 200, offset: 0 })

    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

    expect(await screen.findByText('No public repositories found for this org.')).toBeInTheDocument()
  })

  it('renders in both light and dark theme without crashing', async () => {
    const { unmount } = renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />, { theme: 'light' })
    expect(await screen.findByRole('heading', { name: 'acme' })).toBeInTheDocument()
    unmount()

    renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />, { theme: 'dark' })
    expect(await screen.findByRole('heading', { name: 'acme' })).toBeInTheDocument()
  })

  describe('community links', () => {
    it('shows GitHub as always active, and only shows other platforms as real links when configured', async () => {
      mockedGetOrgLinks.mockResolvedValue({ telegram: 'acme_tg', linkedin: null, whatsapp: null, twitter: null, discord: null })

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)
      await screen.findByRole('heading', { name: 'acme' })

      await waitFor(() => expect(mockedGetOrgLinks).toHaveBeenCalledWith('acme'))
      const github = await screen.findByTitle('GitHub')
      expect(github.tagName).toBe('A')
      expect(github).toHaveAttribute('href', 'https://github.com/acme')

      const telegram = await screen.findByTitle('Telegram')
      expect(telegram.tagName).toBe('A')
      expect(telegram).toHaveAttribute('href', 'https://t.me/acme_tg')

      // Never configured - must render as the inactive (non-link) variant.
      const discord = screen.getByTitle('Discord')
      expect(discord.tagName).toBe('DIV')
    })

    it('hides the Edit links button when the viewer does not maintain this org', async () => {
      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)
      await screen.findByRole('heading', { name: 'acme' })

      await waitFor(() => expect(mockedGetMyProjects).toHaveBeenCalled())
      expect(screen.queryByRole('button', { name: /edit links/i })).not.toBeInTheDocument()
    })

    it('shows Edit links when the viewer owns a project under this org, and saving updates the displayed links', async () => {
      mockedGetMyProjects.mockResolvedValue([
        {
          id: 'proj-acme-1',
          github_full_name: 'acme/widget-kit',
          github_repo_id: 1,
          status: 'verified',
          ecosystem_name: '',
          language: 'TypeScript',
          tags: [],
          category: '',
          verification_error: null,
          verified_at: null,
          webhook_created_at: null,
          webhook_id: null,
          webhook_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
      mockedGetOrgLinks.mockResolvedValue({ telegram: null, linkedin: null, whatsapp: null, twitter: null, discord: null })
      const user = userEvent.setup()

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)
      await screen.findByRole('heading', { name: 'acme' })

      const editButton = await screen.findByRole('button', { name: /edit links/i })
      await user.click(editButton)

      expect(await screen.findByText('Edit community links')).toBeInTheDocument()
      const telegramInput = screen.getByPlaceholderText('e.g. stellopay_official')
      await user.type(telegramInput, 'acme_official')
      await user.click(screen.getByRole('button', { name: /save links/i }))

      await waitFor(() =>
        expect(mockedUpdateOrgLinks).toHaveBeenCalledWith('acme', {
          telegram: 'acme_official',
          linkedin: '',
          whatsapp: '',
          twitter: '',
          discord: '',
        }),
      )
      // The row re-renders from the modal's onSubmitted callback, not a refetch.
      await waitFor(() => expect(screen.getByTitle('Telegram')).toHaveAttribute('href', 'https://t.me/acme_official'))
    })
  })

  describe('contribution calendar', () => {
    it('shows the total contribution count once loaded', async () => {
      mockedGetOrgCalendar.mockResolvedValue({
        calendar: [{ date: '2026-01-01', count: 5, level: 2 }],
        total: 1468,
      })

      renderWithProviders(<OrgProfilePage viewingOrgLogin="acme" />)

      expect(await screen.findByText('1468')).toBeInTheDocument()
      expect(screen.getByText('contributions last year')).toBeInTheDocument()
      expect(mockedGetOrgCalendar).toHaveBeenCalledWith('acme')
    })
  })
})
