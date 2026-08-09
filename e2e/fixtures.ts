import { test as base, expect, type Page } from '@playwright/test'

interface AuthFixtures {
  setupMockAuth: () => Promise<void>
  setupMockBrowse: () => Promise<void>
  setupMockOrgProfile: () => Promise<void>
}

async function mockAuth(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        role: 'contributor',
        github: { login: 'octocat', avatar_url: 'https://example.com/avatar.png' },
      }),
    })
  })
  await page.route('**/stats/landing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active_projects: 4, contributors: 120, grants_distributed_usd: 50000 }),
    })
  })
  await page.route('**/projects/recommended*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [] }) })
  })
}

async function mockBrowse(page: Page) {
  await page.route('**/projects*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          {
            id: 'proj-1',
            github_full_name: 'grainlify/example-repo',
            language: 'TypeScript',
            tags: ['good first issue'],
            category: 'Backend',
            stars_count: 42,
            forks_count: 3,
            contributors_count: 5,
            open_issues_count: 2,
          },
        ],
      }),
    })
  })
  await page.route('**/ecosystems', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ecosystems: [{ id: 'eco-1', name: 'Stellar', status: 'active' }] }),
    })
  })
}

// Mocks the org profile + rating endpoints for org "grainlify". The POST
// handler flips a closure-local flag so a submitted review is reflected in
// subsequent GETs (ratings list + my-status) within the same test, without
// needing a real backend - enough for an end-to-end visual/interaction
// check of the write-a-review flow.
async function mockOrgProfile(page: Page) {
  let submitted: { rating: number; comment: string } | null = null

  await page.route('**/orgs/grainlify/ratings/me', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        eligible: true,
        rating: submitted
          ? { rating: submitted.rating, comment: submitted.comment, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
          : null,
      }),
    })
  })

  await page.route('**/orgs/grainlify/ratings*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { rating: number; comment?: string }
      submitted = { rating: body.rating, comment: body.comment ?? '' }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    const ratings = submitted
      ? [{
          rating: submitted.rating,
          comment: submitted.comment,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          user_id: 'user-1',
          display_name: 'octocat',
          avatar_url: 'https://example.com/avatar.png',
          github_login: 'octocat',
        }]
      : [{
          rating: 5,
          comment: 'Fantastic maintainers, quick to review.',
          created_at: '2025-12-01T00:00:00Z',
          updated_at: '2025-12-01T00:00:00Z',
          user_id: 'user-2',
          display_name: 'Ada Lovelace',
          avatar_url: 'https://example.com/ada.png',
          github_login: 'ada',
        }]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ratings, total: ratings.length }),
    })
  })

  await page.route('**/orgs/grainlify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        login: 'grainlify',
        avatar_url: 'https://example.com/grainlify.png',
        repo_count: 3,
        stars_count: 120,
        contributors_count: 8,
        merged_prs_count: 15,
        rank_position: 2,
        rank_tier: 'ace',
        rank_tier_name: 'Ace',
        rank_tier_color: '#c9983a',
        average_rating: submitted ? (5 + submitted.rating) / 2 : 5,
        ratings_count: submitted ? 2 : 1,
      }),
    })
  })

  // Backs the org page's inline repo grid (getPublicProjects, filtered
  // client-side to this org) - includes a repo from a different org to
  // prove that filter actually excludes it.
  await page.route('**/projects*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          {
            id: 'repo-1',
            github_full_name: 'grainlify/example-repo',
            language: 'TypeScript',
            tags: [],
            category: null,
            stars_count: 120,
            forks_count: 10,
            contributors_count: 8,
            open_issues_count: 2,
            open_prs_count: 1,
            description: 'An example repo',
          },
          {
            id: 'repo-2',
            github_full_name: 'other-org/unrelated-repo',
            language: 'Go',
            tags: [],
            category: null,
            stars_count: 5,
            forks_count: 1,
            contributors_count: 1,
            open_issues_count: 0,
            open_prs_count: 0,
            description: 'Not this org',
          },
        ],
        total: 2,
        limit: 200,
        offset: 0,
      }),
    })
  })
}

export const test = base.extend<AuthFixtures>({
  setupMockAuth: async ({ page }, use) => {
    await use(async () => {
      await mockAuth(page)
    })
  },
  setupMockBrowse: async ({ page }, use) => {
    await use(async () => {
      await mockBrowse(page)
    })
  },
  setupMockOrgProfile: async ({ page }, use) => {
    await use(async () => {
      await mockOrgProfile(page)
    })
  },
})

export { expect }
