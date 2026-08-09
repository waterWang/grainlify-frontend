import { test, expect } from './fixtures'

// This branch's Dashboard has no distinct router paths for its internal
// pages - navigation is `/dashboard?tab=org&org=X`, not `/dashboard/org/X`.
test.describe('Org profile page', () => {
  test.beforeEach(async ({ page, setupMockAuth, setupMockOrgProfile }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123')
      // Dashboard.tsx gates a first-visit product tour on this key (keyed by
      // the user id mockAuth's **/me returns, "user-1") - unset, its
      // full-screen backdrop intercepts every subsequent click in these
      // tests, none of which are testing the tour itself.
      window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    })
    // setupMockOrgProfile must run after setupMockAuth: mockAuth's **/me
    // route would otherwise also swallow **/orgs/grainlify/ratings/me
    // (both end in "/me"), since Playwright matches the most-recently
    // registered route first.
    await setupMockAuth()
    await setupMockOrgProfile()
  })

  test('clicking a Discover org card opens that org\'s own page, not a single repo', async ({ page }) => {
    await page.route('**/projects/recommended*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [{
            id: 'proj-1',
            github_full_name: 'grainlify/example-repo',
            language: 'TypeScript',
            tags: [],
            category: null,
            stars_count: 120,
            forks_count: 10,
            contributors_count: 8,
            open_issues_count: 2,
            open_prs_count: 1,
            ecosystem_name: null,
            ecosystem_slug: null,
            description: 'An example repo',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          }],
        }),
      })
    })
    await page.route('**/projects/*/issues/public*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ issues: [] }) })
    })

    await page.goto('/dashboard?tab=discover')
    await page.getByText('grainlify', { exact: true }).click()

    await expect(page).toHaveURL(/tab=org&org=grainlify/)
    await expect(page.getByRole('heading', { name: 'grainlify' })).toBeVisible({ timeout: 10000 })
    // Stats from GET /orgs/grainlify, not a single repo's detail view.
    // { exact: true }: a plain substring match for "Ace" also matches inside
    // the "Ada Lovelace" reviewer name rendered further down the page.
    await expect(page.getByText('Ace', { exact: true })).toBeVisible()
  })

  test('org page shows stats, rank, reviews, and its repos inline', async ({ page }) => {
    await page.goto('/dashboard?tab=org&org=grainlify')

    await expect(page.getByRole('heading', { name: 'grainlify' })).toBeVisible({ timeout: 10000 })
    // { exact: true }: a plain substring match for "Ace" also matches inside
    // "Ada Lovelace" below (the reviewer name literally ends in "...ace").
    await expect(page.getByText('Ace', { exact: true })).toBeVisible()
    await expect(page.getByText('Ada Lovelace')).toBeVisible()
    await expect(page.getByText('Fantastic maintainers, quick to review.')).toBeVisible()

    // Repos show inline (no separate "view all repos" page), and only this
    // org's own repo - not the unrelated-org fixture repo also in the mock.
    await expect(page.getByText('example-repo')).toBeVisible()
    await expect(page.getByText('unrelated-repo')).not.toBeVisible()
  })

  test('an eligible contributor can write a review and see it appear in the list', async ({ page }) => {
    await page.goto('/dashboard?tab=org&org=grainlify')

    const writeButton = page.getByRole('button', { name: /write a review/i })
    await expect(writeButton).toBeVisible({ timeout: 10000 })
    await writeButton.click()

    await expect(page.getByRole('heading', { name: 'Rate this organization' })).toBeVisible()
    await page.getByRole('radio', { name: '4 stars' }).click()
    await page.getByPlaceholder(/what was it like/i).fill('Smooth review process, would contribute again.')
    await page.getByRole('button', { name: /submit review/i }).click()

    // Submitting shows a success screen first, rather than closing straight
    // away.
    await expect(page.getByText('Thanks for your review!')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Done' }).click()

    await expect(page.getByRole('heading', { name: 'Rate this organization' })).not.toBeVisible()
    await expect(page.getByText('Smooth review process, would contribute again.')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /edit your review/i })).toBeVisible()
  })
})
