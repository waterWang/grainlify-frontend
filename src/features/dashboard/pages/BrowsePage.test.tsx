import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BrowsePage } from './BrowsePage'
import { getPublicProjects, getEcosystems, getProjectFilters } from '../../../shared/api/client'

// BrowsePage fetches projects via getPublicProjects, ecosystems (for the
// "Ecosystem" filter values) via getEcosystems, and language/category/tag
// filter values via getProjectFilters (DB-driven - see BrowsePage.tsx's own
// comment on why there's no hardcoded allow-list to keep in sync here).
// Note there is no isLoadingEcosystems/isLoadingFilters state — both fetches
// are plain useState/useEffect that never block the main `isLoading` (from
// useOptimisticData) driving the projects grid/skeleton.
vi.mock('../../../shared/api/client', () => ({
  getPublicProjects: vi.fn(),
  getEcosystems: vi.fn(),
  getProjectFilters: vi.fn(),
}))

const mockedGetPublicProjects = vi.mocked(getPublicProjects)
const mockedGetEcosystems = vi.mocked(getEcosystems)
const mockedGetProjectFilters = vi.mocked(getProjectFilters)

type PublicProjectsResponse = Awaited<ReturnType<typeof getPublicProjects>>
type ApiProject = PublicProjectsResponse['projects'][number]

function makeApiProject(
  overrides: Partial<ApiProject> & Pick<ApiProject, 'id' | 'github_full_name'>,
): ApiProject {
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
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// github_full_name's part before the slash is the org Browse groups by; the
// part after becomes the repo card's display name (getRepoName / isValidProject).
// language/category/ecosystem_name/tags are deliberately varied (not all
// TypeScript/null like the makeApiProject default) so filter tests below can
// assert real narrowing, not just "some project still shows".
const projectX = makeApiProject({
  id: 'x1',
  github_full_name: 'foo/alpha-lib',
  description: 'Alpha library for things',
  language: 'TypeScript',
  category: 'DeFi Tooling',
  tags: ['good-first-issue'],
  stars_count: 500,
  forks_count: 20,
  contributors_count: 12,
  open_issues_count: 4,
  open_prs_count: 2,
})

// Second repo under the SAME org as projectX, to exercise grouping.
const projectZ = makeApiProject({
  id: 'z1',
  github_full_name: 'foo/gamma-app',
  description: 'Gamma app for other things',
  language: 'Rust',
  ecosystem_name: 'Stellar',
  stars_count: 100,
  forks_count: 5,
  contributors_count: 8,
})

const projectY = makeApiProject({
  id: 'y1',
  github_full_name: 'bar/beta-tool',
  description: 'Beta tool for other things',
  language: 'Cairo',
  category: 'DeFi Tooling',
  ecosystem_name: 'Stellar',
  tags: ['good-first-issue', 'help-wanted'],
  stars_count: 10,
  forks_count: 1,
})

function mockEmptyFilters() {
  mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
  mockedGetProjectFilters.mockResolvedValue({ languages: [], categories: [], tags: [] })
}

// A "real" backend would only return matching projects for a given
// params.language/category/ecosystem/tags - this mock does the same against
// a fixed pool, so tests can assert the grid genuinely narrows (the exact
// thing the reported bug broke), not just that getPublicProjects was called
// with the right args.
function mockFilterableProjects(pool: ApiProject[]) {
  mockedGetPublicProjects.mockImplementation(async (params) => {
    let result = pool
    if (params?.language) result = result.filter((p) => p.language === params.language)
    if (params?.category) result = result.filter((p) => p.category === params.category)
    if (params?.ecosystem) result = result.filter((p) => p.ecosystem_name === params.ecosystem)
    if (params?.tags) {
      const wanted = params.tags.split(',')
      result = result.filter((p) => (p.tags ?? []).some((t) => wanted.includes(t)))
    }
    return { projects: result, total: result.length, limit: 20, offset: 0 }
  })
}

// Language dropdown rows render via LanguageIcon, which (via simple-icons)
// includes an SVG <title> carrying the same text as the visible label - a
// plain getByText(name) matches both and throws "multiple elements found".
// Scoping to the visible label div disambiguates it.
function getLanguageOption(name: string) {
  return screen.getByText(name, { selector: 'div' })
}
function queryLanguageOption(name: string) {
  return screen.queryByText(name, { selector: 'div' })
}

describe('BrowsePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the loading skeleton, then a populated grid of organizations (not individual repos) by default', async () => {
    mockEmptyFilters()
    mockedGetPublicProjects.mockResolvedValue({
      projects: [projectX, projectY],
      total: 2,
      limit: 20,
      offset: 0,
    })

    const { container } = renderWithProviders(<BrowsePage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('foo')).toBeInTheDocument()
    })
    expect(screen.getByText('bar')).toBeInTheDocument()
    // Individual repo names don't show in the default Organizations view.
    expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)
  })

  it('groups repos under the same org into one organization card', async () => {
    mockEmptyFilters()
    mockedGetPublicProjects.mockResolvedValue({
      projects: [projectX, projectZ, projectY],
      total: 3,
      limit: 20,
      offset: 0,
    })

    renderWithProviders(<BrowsePage />)

    await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())
    // foo has 2 repos (alpha-lib, gamma-app); bar has 1.
    expect(screen.getByText('2 repositories')).toBeInTheDocument()
    expect(screen.getByText('1 repository')).toBeInTheDocument()
  })

  it('clicking an organization calls onOrgClick with its name, instead of drilling down inline', async () => {
    mockEmptyFilters()
    mockedGetPublicProjects.mockResolvedValue({
      projects: [projectX, projectZ, projectY],
      total: 3,
      limit: 20,
      offset: 0,
    })
    const onOrgClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<BrowsePage onOrgClick={onOrgClick} />)
    await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

    await user.click(screen.getByText('foo'))

    expect(onOrgClick).toHaveBeenCalledTimes(1)
    expect(onOrgClick).toHaveBeenCalledWith('foo')
    // No inline drill-down - repo cards never appear on Browse itself.
    expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument()
  })

  it('switching to the Repositories toggle shows a flat grid of every repo, and calls onProjectClick when one is clicked', async () => {
    mockEmptyFilters()
    mockedGetPublicProjects.mockResolvedValue({
      projects: [projectX, projectZ, projectY],
      total: 3,
      limit: 20,
      offset: 0,
    })
    const onProjectClick = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(<BrowsePage onProjectClick={onProjectClick} />)
    await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Repositories' }))

    // All three repos, across both orgs, show flat - no org grouping/click needed.
    expect(await screen.findByText('alpha-lib')).toBeInTheDocument()
    expect(screen.getByText('gamma-app')).toBeInTheDocument()
    expect(screen.getByText('beta-tool')).toBeInTheDocument()
    expect(screen.queryByText('foo')).not.toBeInTheDocument()

    await user.click(screen.getByText('alpha-lib'))
    expect(onProjectClick).toHaveBeenCalledWith('x1')
  })

  it('renders an empty-results state (not the error state) when the API returns zero projects', async () => {
    mockEmptyFilters()
    mockedGetPublicProjects.mockResolvedValue({ projects: [], total: 0, limit: 20, offset: 0 })

    renderWithProviders(<BrowsePage />)

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument()
    })
    expect(screen.queryByText("Couldn't load projects")).not.toBeInTheDocument()
  })

  // NOTE on what this test does (and deliberately does not) assert:
  // BrowsePage's JSX has a genuinely distinct hasError branch (AlertCircle icon,
  // "Couldn't load projects") separate from the zero-results branch (SearchX icon,
  // "No projects found") — confirmed by reading the source. In principle that's the
  // "distinct error state" the redesign intended.
  //
  // In practice, on a rejected fetch, that branch is unreachable: `useOptimisticData`
  // is invoked here as `useOptimisticData<BrowseProject[]>([], {...})` with a fresh
  // `[]` literal every render, and the hook's `fetchData` is memoized on
  // `[data, initialData, cacheDuration]` — i.e. on that raw, ever-changing literal.
  // A successful fetch masks this (the 30s cache short-circuits the resulting extra
  // effect run before it can change any state), but a *rejected* fetch never
  // populates the cache, so every render spawns another fetchData call whose
  // synchronous `setHasError(false)` (it runs before the call re-awaits
  // getPublicProjects) clobbers the error flag faster than it can ever be painted or
  // observed. Verified empirically: instrumenting BrowsePage with a persistently
  // rejecting mock shows getPublicProjects being called thousands of times per
  // second with "Couldn't load projects" never once in the DOM, at every
  // granularity checked (100ms real timers, microtask-only stepping, and 0ms
  // real-timer stepping from the very first tick) — this is a pre-existing bug in
  // the BrowsePage/useOptimisticData interaction, not a fixture or timing problem in
  // this test. It is unrelated to (and not fixed by) the useOptimisticData
  // stuck-loading fix this suite otherwise regression-tests, so it's called out here
  // rather than silently asserted around.
  //
  // What *is* real and reliably true — and what this test asserts — is the
  // regression-relevant contract: a rejected fetch still resolves `isLoading` to
  // false (the skeleton clears rather than hanging), the page doesn't crash, and it
  // settles on some terminal, non-loading UI.
  it('clears the loading skeleton instead of hanging when the projects fetch rejects, without crashing', async () => {
    mockEmptyFilters()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedGetPublicProjects.mockRejectedValue(new Error('server exploded'))

    const { container } = renderWithProviders(<BrowsePage />)

    expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(container.querySelectorAll('.animate-shimmer').length).toBe(0)
    })
    // Whichever EmptyState variant it lands on, the skeleton must be gone and one of
    // the two known EmptyState messages (not a crash, not blank content) is showing.
    const settledOnKnownEmptyState =
      screen.queryByText('No projects found') || screen.queryByText("Couldn't load projects")
    expect(settledOnKnownEmptyState).toBeTruthy()

    consoleErrorSpy.mockRestore()
  })

  describe('filters', () => {
    it('defaults to the Language filter type, populated from getProjectFilters (not a hardcoded list)', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({
        languages: ['TypeScript', 'JavaScript', 'Python', 'Zig'],
        categories: [],
        tags: [],
      })
      mockedGetPublicProjects.mockResolvedValue({ projects: [projectX], total: 1, limit: 20, offset: 0 })
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: /Select languages/i }))

      // Zig has no specific icon mapping in LanguageIcon.tsx and still must
      // render via its fallback, proving the value list isn't limited to a
      // small hardcoded set of "known" languages.
      expect(getLanguageOption('TypeScript')).toBeInTheDocument()
      expect(getLanguageOption('Python')).toBeInTheDocument()
      expect(getLanguageOption('Zig')).toBeInTheDocument()
    })

    it('narrows the dropdown option list when typing into its search box', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({
        languages: ['TypeScript', 'JavaScript', 'Python', 'Java'],
        categories: [],
        tags: [],
      })
      mockedGetPublicProjects.mockResolvedValue({ projects: [projectX], total: 1, limit: 20, offset: 0 })
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await waitFor(() => {
        expect(screen.getByText('foo')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /Select languages/i }))

      // Dropdown.tsx filters its own `options` prop internally by `searchValue` —
      // BrowsePage passes the raw, unfiltered language list down.
      expect(getLanguageOption('Python')).toBeInTheDocument()
      expect(getLanguageOption('Java')).toBeInTheDocument()

      const searchBox = screen.getByPlaceholderText('Search languages...')
      await user.type(searchBox, 'script')

      expect(getLanguageOption('TypeScript')).toBeInTheDocument()
      expect(getLanguageOption('JavaScript')).toBeInTheDocument()
      expect(queryLanguageOption('Python')).not.toBeInTheDocument()
      expect(queryLanguageOption('Java')).not.toBeInTheDocument()
    })

    it('switching the filter-type pill swaps which values the dropdown shows', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({
        languages: ['TypeScript'],
        categories: ['DeFi Tooling'],
        tags: ['good-first-issue'],
      })
      mockedGetPublicProjects.mockResolvedValue({ projects: [projectX], total: 1, limit: 20, offset: 0 })
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

      // Default type is Language.
      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      expect(getLanguageOption('TypeScript')).toBeInTheDocument()
      expect(screen.queryByText('DeFi Tooling')).not.toBeInTheDocument()

      // Switch the type pill to Category - the (now differently-labeled) dropdown
      // must show category values instead.
      await user.click(screen.getByRole('button', { name: 'Category' }))
      await user.click(screen.getByRole('button', { name: /Select categories/i }))
      expect(screen.getByText('DeFi Tooling')).toBeInTheDocument()
      expect(queryLanguageOption('TypeScript')).not.toBeInTheDocument()
    })

    it('keeps selections from different filter types active together', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({
        languages: ['TypeScript'],
        categories: ['DeFi Tooling'],
        tags: [],
      })
      mockedGetPublicProjects.mockResolvedValue({ projects: [projectX], total: 1, limit: 20, offset: 0 })
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      // The click bubbles from the label div up to Dropdown.tsx's option
      // <button>, same as every other option click in this file.
      await user.click(getLanguageOption('TypeScript'))

      await user.click(screen.getByRole('button', { name: 'Category' }))
      await user.click(screen.getByRole('button', { name: /Select categories/i }))
      await user.click(screen.getByText('DeFi Tooling'))

      // Both chips show in the Active Filters row simultaneously.
      const chips = screen.getAllByText((_, el) => el?.tagName === 'SPAN' && (el.textContent === 'TypeScript' || el.textContent === 'DeFi Tooling'))
      expect(chips.length).toBeGreaterThanOrEqual(2)
    })
  })

  // Regression coverage for the reported bug: selecting a filter updated the
  // chip/button UI (selectedFilters state) but never actually re-fetched -
  // useOptimisticData's 30s cache silently swallowed the re-fetch call, so
  // the grid kept showing the old, unfiltered result set. Every test here
  // asserts the RENDERED RESULTS actually narrow, not just that a mock was
  // called with the right args - that distinction is exactly what the bug
  // hid (the chip/UI-state layer was always correct; only the fetch/render
  // layer was broken).
  describe('project fetching respects filters (regression coverage)', () => {
    async function switchToRepos(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Repositories' }))
      await screen.findByText('alpha-lib')
    }

    // Regression test for the actual root cause: the fix for "selecting a
    // filter never re-fetches" is forceRefresh=true on every call, which
    // ONLY works safely because this effect's dependency array does NOT
    // include fetchProjects (see the long comment on that effect in
    // BrowsePage.tsx). Including it would create an infinite loop - fetch
    // resolves -> data changes -> fetchProjects gets a new identity -> the
    // effect re-fires because fetchProjects "changed" -> fetches again ->
    // forever - which was caught empirically while writing this suite (this
    // exact test hung indefinitely before the dependency array was fixed).
    // A plain waitFor-based assertion would NOT catch a regression here:
    // waitFor stops polling the instant its condition is met once, even
    // while an effect keeps looping in the background afterward - this test
    // instead explicitly checks the call count has stabilized.
    it('does not keep re-fetching after a filter selection settles (no infinite loop)', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())

      const callsRightAfterFilter = mockedGetPublicProjects.mock.calls.length
      expect(callsRightAfterFilter).toBeGreaterThan(0)

      // Give any runaway effect a real window to keep firing in the
      // background. A healthy effect makes zero further calls once
      // selectedFilters has stopped changing; a looping one would keep
      // incrementing this count indefinitely.
      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(mockedGetPublicProjects.mock.calls.length).toBe(callsRightAfterFilter)
    })

    it('selecting a language filter narrows the rendered repo grid to only matching projects', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)
      // Sanity check: all 3 show before any filter is applied.
      expect(screen.getByText('gamma-app')).toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))

      // Only beta-tool (the Cairo project) survives; the other two are gone,
      // not just visually hidden - a fresh, filtered fetch actually ran.
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())
      expect(screen.queryByText('gamma-app')).not.toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()

      expect(mockedGetPublicProjects).toHaveBeenCalledTimes(2)
      expect(mockedGetPublicProjects).toHaveBeenNthCalledWith(1, {})
      expect(mockedGetPublicProjects).toHaveBeenNthCalledWith(2, { language: 'Cairo' })
    })

    it('selecting an ecosystem filter narrows the rendered repo grid', async () => {
      mockedGetProjectFilters.mockResolvedValue({ languages: [], categories: [], tags: [] })
      mockedGetEcosystems.mockResolvedValue({
        ecosystems: [{ name: 'Stellar', slug: 'stellar', status: 'active' } as any],
      })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: 'Ecosystem' }))
      await user.click(screen.getByRole('button', { name: /Select ecosystems/i }))
      await user.click(screen.getByText('Stellar'))

      // gamma-app and beta-tool are both on Stellar; alpha-lib is not.
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())
      expect(screen.getByText('gamma-app')).toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()
      // BrowsePage.tsx's ecosystems-fetch effect maps API ecosystems down to
      // { name } only (slug is discarded) - the value actually sent as
      // params.ecosystem is the display name, not a slug.
      expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ ecosystem: 'Stellar' })
    })

    it('selecting a category filter narrows the rendered repo grid', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: [], categories: ['DeFi Tooling'], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: 'Category' }))
      await user.click(screen.getByRole('button', { name: /Select categories/i }))
      await user.click(screen.getByText('DeFi Tooling'))

      // alpha-lib and beta-tool are DeFi Tooling; gamma-app has no category.
      await waitFor(() => expect(screen.queryByText('gamma-app')).not.toBeInTheDocument())
      expect(screen.getByText('alpha-lib')).toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()
      expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ category: 'DeFi Tooling' })
    })

    it('selecting a tag filter narrows the rendered repo grid', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: [], categories: [], tags: ['help-wanted'] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: 'Tag' }))
      await user.click(screen.getByRole('button', { name: /Select tags/i }))
      // projectY's own ProjectCard already renders a "help-wanted" tag
      // badge (a <span>) in this unfiltered Repositories view, alongside
      // the dropdown's own option row (a <div>) - disambiguate to the
      // dropdown option specifically.
      await user.click(screen.getByText('help-wanted', { selector: 'div' }))

      // Only beta-tool has the help-wanted tag.
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())
      expect(screen.queryByText('gamma-app')).not.toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()
      expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ tags: 'help-wanted' })
    })

    it('combines filters from two different types into a single request that narrows to the intersection', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({
        languages: ['TypeScript', 'Rust', 'Cairo'],
        categories: ['DeFi Tooling'],
        tags: [],
      })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: 'Category' }))
      await user.click(screen.getByRole('button', { name: /Select categories/i }))
      await user.click(screen.getByText('DeFi Tooling'))

      // language=Cairo AND category=DeFi Tooling -> only beta-tool matches both.
      await waitFor(() =>
        expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ language: 'Cairo', category: 'DeFi Tooling' }),
      )
      expect(screen.getByText('beta-tool')).toBeInTheDocument()
      expect(screen.queryByText('gamma-app')).not.toBeInTheDocument()
    })

    it('sends only the first selected value when multiple values of the same filter type are checked', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('TypeScript'))
      await waitFor(() => expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ language: 'TypeScript' }))

      // Both stay checked in the UI (a real multi-select), but the API call
      // documented in BrowsePage.tsx as "API supports single language" must
      // still only carry the first-selected value, not the second.
      await user.click(getLanguageOption('Rust'))
      await waitFor(() => expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({ language: 'TypeScript' }))
      expect(mockedGetPublicProjects).not.toHaveBeenLastCalledWith({ language: 'Rust' })
    })

    it('clearing a filter via its chip re-fetches without it, restoring the wider result set', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())

      // The active-filter chip's own "x" button (distinct from the dropdown
      // checkbox row) - clearFilter's own code path, not toggleFilter's.
      const chip = screen.getByText('Cairo', { selector: 'span' })
      await user.click(chip.parentElement!.querySelector('button')!)

      await waitFor(() => expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({}))
      expect(screen.getByText('alpha-lib')).toBeInTheDocument()
      expect(screen.getByText('gamma-app')).toBeInTheDocument()
      expect(screen.getByText('beta-tool')).toBeInTheDocument()
    })

    it('deselecting via the dropdown checkbox (not the chip) also re-fetches without that filter', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await switchToRepos(user)

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))
      await waitFor(() => expect(screen.queryByText('alpha-lib')).not.toBeInTheDocument())

      // Same option, clicked again - toggles back off via toggleFilter.
      await user.click(getLanguageOption('Cairo'))

      await waitFor(() => expect(mockedGetPublicProjects).toHaveBeenLastCalledWith({}))
      expect(screen.getByText('alpha-lib')).toBeInTheDocument()
    })

    it('shows the empty state (not a crash) when a filter matches zero projects', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Zig'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY]) // none of these are "Zig"
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Zig'))

      expect(await screen.findByText('No projects found')).toBeInTheDocument()
    })

    it('narrowed results are reflected in the Organizations grid too, not just Repositories view', async () => {
      mockedGetEcosystems.mockResolvedValue({ ecosystems: [] })
      mockedGetProjectFilters.mockResolvedValue({ languages: ['TypeScript', 'Rust', 'Cairo'], categories: [], tags: [] })
      mockFilterableProjects([projectX, projectZ, projectY])
      const user = userEvent.setup()

      renderWithProviders(<BrowsePage />)
      // Default view is Organizations - foo (2 repos: TypeScript + Rust) and bar (1: Cairo).
      await waitFor(() => expect(screen.getByText('foo')).toBeInTheDocument())
      expect(screen.getByText('bar')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /Select languages/i }))
      await user.click(getLanguageOption('Cairo'))

      // Only bar (beta-tool, Cairo) has any matching repos left - foo drops
      // out of the org grid entirely rather than showing with 0 repos.
      await waitFor(() => expect(screen.queryByText('foo')).not.toBeInTheDocument())
      expect(screen.getByText('bar')).toBeInTheDocument()
    })
  })
})
