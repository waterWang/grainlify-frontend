import { test, expect } from './fixtures'

/**
 * Layout properties that only a real browser can check.
 *
 * Every one of these was reported from production while the unit suite was
 * green, because jsdom has no layout: it cannot tell you that two cards render
 * at different heights, that a page cannot be scrolled, or that a badge is a
 * rectangle. These need boxes, so they live here.
 */

const auth = async (page: any) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
  })
}

// A project carrying three labels made its whole grid row taller than the row
// above it. The card is what must be fixed - any container showing one
// inherits it - so the assertion is about cards, not the grid.
test('every recommended project card is the same height, whatever it carries', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await auth(page)

  // Deliberately lopsided: no labels, one, and four.
  await page.route((url) => url.pathname === '/projects/recommended', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        // Eight DISTINCT owners (the grid dedupes to one card per owner), and
        // the heavy card carries an ecosystem name PLUS two tags - three chips.
        // DiscoverPage already slices tags to two, so a fourth tag changes
        // nothing; the third chip is the ecosystem. Without it, reverting the
        // fix produced identical heights and this test could not fail.
        //
        // Measured pre-fix: 233px against 273px, at every width from 640 to
        // 1600 except 900.
        // Eight DISTINCT owners. The grid dedupes to one card per owner, so
        // eight repos under one org rendered a single card and the count
        // assertion below caught it.
        // Eight, so the grid produces two rows at the widest breakpoint.
        // Three cards was a single row, and grid stretches items within a row
        // to equal height on its own - so the first version of this test
        // passed with the fix reverted. The bug lives ACROSS rows, because
        // each row sizes independently.
        projects: [
          { id: 'p1', github_full_name: 'orgbare/repo', language: null, tags: [], stars_count: 1, forks_count: 1 },
          { id: 'p2', github_full_name: 'orgB/r', language: 'TypeScript', tags: [], ecosystem_name: 'Stellar', stars_count: 2, forks_count: 2 },
          { id: 'p3', github_full_name: 'orgC/r', language: 'Go', tags: [], ecosystem_name: 'Stellar', stars_count: 3, forks_count: 3 },
          { id: 'p4', github_full_name: 'orgD/r', language: 'Rust', tags: [], stars_count: 4, forks_count: 4 },
          // Three chips: ecosystem + two tags. This is the card that wrapped to
          // a second label line and made its whole grid row 40px taller.
          { id: 'p5', github_full_name: 'orgE/r', language: 'Rust', tags: ['open-source', 'soroban-sdk'], ecosystem_name: 'Stellar', stars_count: 5, forks_count: 5 },
          { id: 'p6', github_full_name: 'orgF/r', language: null, tags: [], stars_count: 6, forks_count: 6 },
          { id: 'p7', github_full_name: 'orgG/r', language: 'Python', tags: [], ecosystem_name: 'Stellar', stars_count: 7, forks_count: 7 },
          { id: 'p8', github_full_name: 'orgH/r', language: null, tags: [], stars_count: 8, forks_count: 8 },
        ],
      }),
    })
  })

  await page.goto('/dashboard?tab=discover')
  await page.waitForTimeout(1200)

  // The card itself, by test id. The first version matched on a utility class
  // and picked up the grid wrapper instead - which grid stretches to equal
  // heights within a row regardless, so the assertion could not fail.
  const heights = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid="discover-project-card"]'))
      .map((el) => Math.round(el.getBoundingClientRect().height)))

  // Enough cards for two rows, or the test cannot see the bug it exists for.
  expect(heights.length, 'need at least 5 cards to produce a second grid row').toBeGreaterThanOrEqual(5)
  const unique = [...new Set(heights)]
  expect(unique, `cards rendered at ${unique.join(', ')}px - a card with more labels is taller than one with fewer`)
    .toHaveLength(1)
})

// The page was its own scroll container sized to a parent with no height, so
// everything past the fold was unreachable. Checked at a SHORT viewport,
// because at a tall one there may be nothing below the fold to miss.
test('the ecosystem page scrolls at a short viewport', async ({
  page, setupMockAuth, setupMockBrowse, setupMockOrgProfile,
}) => {
  await setupMockAuth(); await setupMockBrowse(); await setupMockOrgProfile()
  await auth(page)
  await page.setViewportSize({ width: 1280, height: 500 })

  await page.goto('/dashboard?tab=ecosystems')
  await page.waitForTimeout(1200)

  const before = await page.evaluate(() => window.scrollY)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => ({
    y: window.scrollY,
    scrollable: document.body.scrollHeight > window.innerHeight,
  }))

  test.skip(!after.scrollable, 'page is shorter than the viewport; nothing below the fold')
  expect(after.y, 'the document did not move - content below the fold is unreachable')
    .toBeGreaterThan(before)
})
