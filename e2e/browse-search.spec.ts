import { test, expect } from './fixtures'

// This branch's Dashboard has no distinct router paths for its internal
// pages - navigation is `/dashboard?tab=browse`, not `/dashboard/browse`.
test.describe('Browse and search', () => {
  test.beforeEach(async ({ page, setupMockAuth, setupMockBrowse }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('patchwork_jwt', 'mock_jwt_token_123')
      // Dashboard.tsx gates a first-visit product tour on this key (keyed by
      // the user id mockAuth's **/me returns, "user-1"). Left unset, the
      // tour's dialog traps focus, silently swallowing the Ctrl+K shortcut
      // the second test below depends on.
      window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
    })
    await setupMockAuth()
    await setupMockBrowse()
  })

  test('browse tab renders the mocked project grid', async ({ page }) => {
    await page.goto('/dashboard?tab=browse')
    // Browse groups repos into an org grid first (one card per owner) -
    // drill into "grainlify" to reach its one repo, "example-repo" (org
    // prefix stripped from the repo card's own heading).
    await page.getByText('grainlify', { exact: true }).click()
    await expect(page.getByRole('heading', { name: 'example-repo' })).toBeVisible({ timeout: 10000 })
  })

  test('opening search via the nav and typing shows matching results', async ({ page }) => {
    await page.goto('/dashboard?tab=discover')
    await page.keyboard.press('Control+k')
    const searchInput = page.getByPlaceholder(/search/i).first()
    await expect(searchInput).toBeVisible({ timeout: 10000 })
    await searchInput.fill('dashboard')
    await expect(page.getByText('Add dark mode support')).toBeVisible()
  })
})
