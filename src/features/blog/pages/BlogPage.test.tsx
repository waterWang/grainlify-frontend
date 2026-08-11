import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { BlogPage } from './BlogPage'
import { featuredPost, recentPosts, allBlogPosts } from '../data/blogPosts'

// BlogPage takes no props and fetches nothing. It is a static composition of
// BlogHero, FeaturedPost, RecentPostsGrid and BlogStyles in its index state,
// and BlogPostView once an article is opened. All content comes from
// ../data/blogPosts; nothing here touches shared/api/client or useAuth.
describe('BlogPage', () => {
  it('renders the hero and every post in the index', () => {
    renderWithProviders(<BlogPage />)

    expect(screen.getByText('Grainlify Blog')).toBeInTheDocument()
    expect(screen.getByText('FEATURED')).toBeInTheDocument()
    expect(screen.getByText(featuredPost.title)).toBeInTheDocument()
    expect(screen.getByText(featuredPost.excerpt)).toBeInTheDocument()

    expect(recentPosts.length).toBeGreaterThan(0)
    recentPosts.forEach((post) => {
      expect(screen.getByText(post.title)).toBeInTheDocument()
    })
  })

  it('opens the featured article and can return to the index', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BlogPage />)

    await user.click(screen.getByRole('button', { name: /read full story/i }))

    // The article body is rendered, not just the excerpt that led nowhere
    // before — "Read Full Story" used to be a button with no handler at all.
    expect(screen.getByRole('heading', { level: 1, name: featuredPost.title })).toBeInTheDocument()
    expect(screen.getByText(/the Founding Contributor Pool/i)).toBeInTheDocument()
    // The index is gone while reading.
    expect(screen.queryByText('Grainlify Blog')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /all articles/i })[0])
    expect(screen.getByText('Grainlify Blog')).toBeInTheDocument()
  })

  it('opens each recent post from its card', async () => {
    const user = userEvent.setup()

    for (const post of recentPosts) {
      const { unmount } = renderWithProviders(<BlogPage />)

      await user.click(screen.getByRole('button', { name: `Read: ${post.title}` }))
      expect(screen.getByRole('heading', { level: 1, name: post.title })).toBeInTheDocument()

      unmount()
    }
  })

  it('renders markdown structure rather than raw markdown source', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BlogPage />)

    await user.click(screen.getByRole('button', { name: /read full story/i }))

    const article = screen.getByRole('article')
    // Real headings and a real table, i.e. the markdown was parsed.
    expect(within(article).getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)
    expect(within(article).getAllByRole('table').length).toBeGreaterThan(0)
    // And no literal markdown syntax leaking into the rendered text.
    expect(article.textContent).not.toMatch(/\*\*/)
    expect(article.textContent).not.toMatch(/^## /m)
  })

  // The placeholder content this replaced described a points system that had
  // been retired, priced in dollars per referral, and enumerated specific
  // blockchains — all three are things the product deliberately does not do.
  // These assert the replacement did not reintroduce them.
  it('carries no retired or off-message content', () => {
    const everything = allBlogPosts
      .map((p) => `${p.title} ${p.excerpt} ${p.content}`)
      .join('\n')

    // Points are retired. They may be named as history, but never as a live
    // way to earn — the giveaway phrasing is a present-tense rate.
    expect(everything).not.toMatch(/earn \d+ points/i)
    expect(everything).not.toMatch(/redeem(able)? (your )?points for/i)

    // Chain-agnostic positioning: no naming specific networks.
    for (const chain of ['Ethereum', 'Solana', 'Polkadot', 'Cosmos', 'Polygon']) {
      expect(everything).not.toContain(chain)
    }

    // Stale brand from the placeholder content.
    expect(everything).not.toContain('OnlyGrain')
  })

  it('every post has a body, a unique slug, and no placeholder text', () => {
    const slugs = allBlogPosts.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)

    allBlogPosts.forEach((post) => {
      expect(post.slug).toMatch(/^[a-z0-9-]+$/)
      // Long enough that it is a real article rather than a stub.
      expect(post.content.length).toBeGreaterThan(2000)
      expect(post.content).not.toMatch(/lorem ipsum|TODO|Coming soon/i)
    })
  })

  it('renders in both light and dark theme without crashing', () => {
    const { unmount } = renderWithProviders(<BlogPage />, { theme: 'light' })
    expect(screen.getByText('Grainlify Blog')).toBeInTheDocument()
    unmount()

    renderWithProviders(<BlogPage />, { theme: 'dark' })
    expect(screen.getByText('Grainlify Blog')).toBeInTheDocument()
  })
})
