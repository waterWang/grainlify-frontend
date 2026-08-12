import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { expectNoPersistentAnimation } from '../../../test/noPersistentAnimation'
import { LeaderboardPage } from './LeaderboardPage'
import { getLeaderboard, getProjectLeaderboard, getEcosystems } from '../../../shared/api/client'

// LeaderboardPage itself fetches getLeaderboard (contributors, the default tab) and
// getProjectLeaderboard (only once the user switches to the "projects" tab, not on
// mount). Its child FiltersSection also independently calls getEcosystems() on mount
// to populate the ecosystem filter dropdown, so that must be mocked here too even
// though LeaderboardPage never imports it directly itself.
vi.mock('../../../shared/api/client', () => ({
  getLeaderboard: vi.fn(),
  getProjectLeaderboard: vi.fn(),
  getEcosystems: vi.fn(),
}))

const mockedGetLeaderboard = vi.mocked(getLeaderboard)
const mockedGetProjectLeaderboard = vi.mocked(getProjectLeaderboard)
const mockedGetEcosystems = vi.mocked(getEcosystems)

type LeaderboardResponse = Awaited<ReturnType<typeof getLeaderboard>>
type ApiLeaderRow = LeaderboardResponse[number]

function makeLeaderRow(
  overrides: Partial<ApiLeaderRow> & Pick<ApiLeaderRow, 'rank' | 'username'>,
): ApiLeaderRow {
  return {
    rank_tier: 'gold',
    rank_tier_name: 'Gold',
    avatar: `https://github.com/${overrides.username}.png?size=200`,
    user_id: `user-${overrides.rank}`,
    merged_prs: 0,
    ecosystems: [],
    score: 0,
    ...overrides,
  }
}

const row1 = makeLeaderRow({
  rank: 1,
  username: 'octocat',
  score: 980,
  user_id: 'u1',
  merged_prs: 980,
  ecosystems: ['Web3'],
})
const row2 = makeLeaderRow({
  rank: 2,
  username: 'hubot',
  score: 875,
  user_id: 'u2',
  merged_prs: 875,
  ecosystems: ['AI'],
})
const row3 = makeLeaderRow({
  rank: 3,
  username: 'monalisa',
  score: 760,
  user_id: 'u3',
  merged_prs: 760,
  ecosystems: ['Data'],
})

type ProjectLeaderboardResponse = Awaited<ReturnType<typeof getProjectLeaderboard>>
type ApiProject = ProjectLeaderboardResponse['projects'][number]

// The projects board is now ranked by the server, so a fixture is a ranked
// row rather than a repo the browser has to aggregate.
function makeApiProject(
  overrides: Partial<ApiProject> & Pick<ApiProject, 'rank' | 'name'>,
): ApiProject {
  return {
    logo: `https://github.com/${overrides.name}.png?size=200`,
    contributors: 0,
    merged_prs: 0,
    open_issues: 0,
    activity: 'Low',
    ecosystems: [],
    score: 0,
    ...overrides,
  }
}

function projectsResponse(projects: ApiProject[]): ProjectLeaderboardResponse {
  return { projects, total: projects.length, limit: 100, offset: 0 }
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
  })

  it('shows the podium/table skeletons, then a populated ranked list with real row data once the leaderboard loads', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

    const { container } = renderWithProviders(<LeaderboardPage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getAllByText('octocat').length).toBeGreaterThan(0)
    })
    // Each of the top 3 renders twice: once in the podium, once as a table row.
    expect(screen.getAllByText('octocat').length).toBe(2)
    expect(screen.getAllByText('hubot').length).toBe(2)
    expect(screen.getAllByText('monalisa').length).toBe(2)
    expect(screen.getAllByText('980').length).toBe(2)
    expect(screen.getAllByText('875').length).toBe(2)
    expect(screen.getAllByText('760').length).toBe(2)
    // Rank numbers appear in the table's rank column.
    expect(screen.getByText('Rank')).toBeInTheDocument()

    // Nothing on this page animates once the skeletons clear. Checked against
    // every infinite animation the codebase defines, not just the shimmer this
    // used to watch — an assertion pinned to one class stops testing anything
    // the moment somebody adds a different one.
    expectNoPersistentAnimation(container)
    // Requests PAGE_SIZE+1 (26) so the response length can reveal whether a
    // next page exists, without the backend needing to return a total count.
    expect(mockedGetLeaderboard).toHaveBeenCalledWith(26, 0, undefined, 'season')
    // The "projects" leaderboard type never loads on mount — only once the user
    // switches tabs — since the default leaderboardType is "contributors".
    expect(mockedGetProjectLeaderboard).not.toHaveBeenCalled()
  })

  it('renders an empty state (no podium) when the API returns zero contributors', async () => {
    mockedGetLeaderboard.mockResolvedValue([])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('No contributors yet. Be the first to contribute!')).toBeInTheDocument()
    })
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
  })

  it('does not crash when the leaderboard fetch fails, and settles on the empty state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedGetLeaderboard.mockRejectedValue(new Error('server exploded'))

    const { container } = renderWithProviders(<LeaderboardPage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('No contributors yet. Be the first to contribute!')).toBeInTheDocument()
    })
    // Same rule as above: still, even on the error path.
    expectNoPersistentAnimation(container)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('gives the podium its full 1st/2nd/3rd special treatment once 3 or more contributors are returned', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
  })

  describe('Projects tab', () => {
    // The org-vs-repo aggregation, the .github exclusion and the
    // distinct-contributor count all moved into SQL (internal/ranking), where
    // they are covered by the backend suite. What is left to assert here is
    // that the page renders the server's ranking as given rather than
    // re-deriving one of its own - the previous browser-side version summed
    // per-repo counts off a top-50 sample and got both answers wrong.
    it('renders the server-ranked org list verbatim, without re-ranking it', async () => {
      mockedGetLeaderboard.mockResolvedValue([])
      mockedGetProjectLeaderboard.mockResolvedValue(
        projectsResponse([
          makeApiProject({
            rank: 1,
            name: 'acme',
            contributors: 45,
            merged_prs: 120,
            score: 45,
            ecosystems: ['Web3'],
          }),
          makeApiProject({ rank: 2, name: 'globex', contributors: 10, score: 10 }),
        ]),
      )
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await user.click(screen.getByRole('button', { name: 'Projects' }))

      await waitFor(() => expect(screen.getAllByText('acme').length).toBeGreaterThan(0))
      expect(screen.getAllByText('globex').length).toBeGreaterThan(0)
      expect(screen.getAllByText('45').length).toBeGreaterThan(0)
    })

    it('asks the server for the projects board rather than deriving it from /projects/recommended', async () => {
      mockedGetLeaderboard.mockResolvedValue([])
      mockedGetProjectLeaderboard.mockResolvedValue(projectsResponse([]))
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await user.click(screen.getByRole('button', { name: 'Projects' }))

      await waitFor(() => expect(mockedGetProjectLeaderboard).toHaveBeenCalled())
      expect(mockedGetProjectLeaderboard).toHaveBeenCalledWith(100, 0, undefined, 'season')
    })
  })

  describe('Window toggle', () => {
    it('defaults to the season board and refetches all-time on demand', async () => {
      mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)

      // An all-time cumulative board is uncatchable for anyone who arrives
      // after the first cohort, so the default view has to be the rolling one.
      await waitFor(() =>
        expect(mockedGetLeaderboard).toHaveBeenCalledWith(26, 0, undefined, 'season'),
      )

      await user.click(screen.getByRole('button', { name: 'All time' }))

      await waitFor(() =>
        expect(mockedGetLeaderboard).toHaveBeenLastCalledWith(26, 0, undefined, 'all'),
      )
    })
  })

  describe('Removed controls', () => {
    it('does not offer a "Total Rewards" filter, which was backed by no data and changed nothing', async () => {
      mockedGetLeaderboard.mockResolvedValue([row1])
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await waitFor(() => expect(screen.getAllByText('octocat').length).toBeGreaterThan(0))

      await user.click(screen.getByRole('button', { name: 'Overall Leaderboard' }))

      expect(await screen.findByRole('button', { name: 'Total Contributions' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Total Rewards' })).not.toBeInTheDocument()
    })

    it('does not render a Trend column, which showed "no change" for every contributor forever', async () => {
      mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

      renderWithProviders(<LeaderboardPage />)
      await waitFor(() => expect(screen.getAllByText('octocat').length).toBeGreaterThan(0))

      expect(screen.queryByText('Trend')).not.toBeInTheDocument()
    })
  })

  it('only shows the 1st place podium slot when just 1 contributor is returned', async () => {
    mockedGetLeaderboard.mockResolvedValue([row1])

    renderWithProviders(<LeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
    expect(screen.queryByText('#2')).not.toBeInTheDocument()
    expect(screen.queryByText('#3')).not.toBeInTheDocument()
  })

  describe('Pagination', () => {
    it('hides the pagination bar entirely when everything fits on one page', async () => {
      mockedGetLeaderboard.mockResolvedValue([row1, row2, row3])

      renderWithProviders(<LeaderboardPage />)

      await waitFor(() => expect(screen.getAllByText('octocat').length).toBeGreaterThan(0))
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    })

    it('reveals page 2 and fetches it with the right offset when the first page is full (26 requested, 26 returned)', async () => {
      const page1 = Array.from({ length: 26 }, (_, i) =>
        makeLeaderRow({ rank: i + 1, username: `user${i + 1}`, score: 100 - i }),
      )
      const page2 = [makeLeaderRow({ rank: 26, username: 'lastuser', score: 1 })]
      mockedGetLeaderboard.mockImplementation(async (_limit, offset) =>
        offset === 0 ? page1 : page2,
      )
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)

      // 26 rows came back for a 25-per-page request - page 2 is now known to exist.
      await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument())
      // Only the first 25 of the 26 returned rows are actually displayed.
      expect(screen.getAllByText('user25').length).toBeGreaterThan(0)
      expect(screen.queryByText('user26')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Page 2' }))

      await waitFor(() => expect(mockedGetLeaderboard).toHaveBeenCalledWith(26, 25, undefined, 'season'))
      expect(await screen.findByText('lastuser')).toBeInTheDocument()
    })

    it('resets to page 1 when the ecosystem filter changes', async () => {
      const page1 = Array.from({ length: 26 }, (_, i) =>
        makeLeaderRow({ rank: i + 1, username: `user${i + 1}` }),
      )
      mockedGetLeaderboard.mockResolvedValue(page1)
      mockedGetEcosystems.mockResolvedValue({
        ecosystems: [{ name: 'Web3', slug: 'web3', status: 'active' } as any],
      })
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Page 2' }))
      await waitFor(() => expect(mockedGetLeaderboard).toHaveBeenLastCalledWith(26, 25, undefined, 'season'))

      await user.click(screen.getByRole('button', { name: 'All Ecosystems' }))
      await user.click(await screen.findByRole('button', { name: 'Web3' }))

      // Filter changed while on page 2 - the request must go out for page 1
      // (offset 0) of the new filter, not page 2 of it.
      await waitFor(() => expect(mockedGetLeaderboard).toHaveBeenLastCalledWith(26, 0, 'web3', 'season'))
    })
  })

  describe('Projects tab pagination', () => {
    it('paginates the already-loaded projects list client-side, 25 per page', async () => {
      const projects = Array.from({ length: 30 }, (_, i) =>
        makeApiProject({ rank: i + 1, name: `org${i}`, contributors: 30 - i, score: 30 - i }),
      )
      mockedGetLeaderboard.mockResolvedValue([])
      mockedGetProjectLeaderboard.mockResolvedValue(projectsResponse(projects))
      const user = userEvent.setup()

      renderWithProviders(<LeaderboardPage />)
      await user.click(screen.getByRole('button', { name: 'Projects' }))

      // 30 orgs at 25/page - page 2 exists, and it's a real total (the whole
      // list is already loaded), so no "load more" round-trip is needed.
      await waitFor(() => expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument())
      expect(screen.getAllByText('org0').length).toBeGreaterThan(0)
      expect(screen.queryByText('org29')).not.toBeInTheDocument()
      // The board is fetched once up front, not once per page.
      expect(mockedGetProjectLeaderboard).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button', { name: 'Page 2' }))
      expect(mockedGetProjectLeaderboard).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('org29').length).toBeGreaterThan(0)
    })
  })
})
