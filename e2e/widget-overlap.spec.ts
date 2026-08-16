import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * No fixed-position element may cover an interactive one.
 *
 * This began as a much larger suite that measured one specific widget against
 * every page. That widget used to render at `fixed bottom-5 right-5` and was
 * reported three times for sitting on top of whatever a page ended with - a
 * Save button on four settings tabs, and the Accept button on terms, which
 * could not be clicked at all.
 *
 * It has since been moved into the dashboard's icon rail and the public-route
 * chrome, so most of that machinery measured a hazard that no longer exists.
 * What remains is the general property, because the bug was never really about
 * one widget: bottom-right is where applications put primary actions, and any
 * future floating element would land in the same fight. A toast, a cookie
 * banner, a chat bubble, the next "quick action" button.
 *
 * WHAT IS ASSERTED, and why it is this and not something stricter:
 *
 * A fixed overlay covers whatever scrolls under it, so "nothing ever
 * intersects at any scroll offset" is unsatisfiable on a page with a long
 * list. The property that matters is REACHABILITY: can the user get the
 * control out from under the overlay?
 *
 * So this runs in two phases. It scans at the bottom of the page for controls
 * whose CENTRE - the point a click lands on - is covered by a fixed element,
 * then scrolls each candidate to the middle of the viewport and checks again.
 * Only something still covered when centred is genuinely unreachable.
 *
 * The second phase is not belt-and-braces, it is what makes the check correct.
 * A first version stopped after phase one and reported two failures that were
 * not bugs: the dashboard's top-anchored header covering a tab bar that had
 * scrolled under it (reachable by scrolling up), and a transient toast. A
 * check that flags legitimate overlays is one that gets disabled.
 *
 * WHY THIS CATCHES 3 PAGES AND NOT 5, and why that is not weaker coverage:
 *
 * Reintroducing a floating bottom-right button fails this on three pages. The
 * earlier version of this suite - which asserted bounding-box overlap against
 * one specific widget - found five. The smaller number is a different
 * question, not less of the same one.
 *
 * Overlap asks "is anything drawn on top of this control". Reachability asks
 * "can the user get at it". Two of the original five were Save buttons on
 * pages long enough to scroll: covered at the very bottom of the page, clear
 * again after scrolling a little. Annoying, and worth fixing by not putting a
 * button in that corner - which is what happened - but not blocking anyone.
 * The three that still fail are controls that stay covered wherever you
 * scroll, which is the case where a person simply cannot complete the action.
 *
 * If a future change makes this suite look too permissive, the thing to change
 * is the question it asks, deliberately - not to assume coverage was lost.
 *
 * The sidebar rail is itself fixed, by design. It does not overlap content
 * because the page is offset by its width - which is the property being
 * checked, so it is not excluded here.
 */

// Enumerated rather than sampled: sampling is what produced a fix for one page,
// three times over.
const DASHBOARD_TABS = [
  'discover', 'browse', 'leaderboard', 'contributors', 'maintainers',
  'ecosystems', 'osw', 'blog', 'search', 'profile', 'data', 'org',
  'grainhack', 'my-grainhack', 'settings', 'admin',
]
const SETTINGS_SUBTABS = ['profile', 'notifications', 'referrals', 'rewards', 'payout', 'billing', 'terms']

// minInteractive is the number of interactive elements below which the page
// has plainly not rendered. Without it this suite passes on a blank page: an
// earlier version reported 26 green while 25 of the pages had white-screened
// on a mock that answered the wrong shape, and a page with nothing on it
// cannot be overlapped by anything.
const PAGES: { name: string; url: string; minInteractive: number }[] = [
  { name: 'landing', url: '/', minInteractive: 20 },
  { name: 'signin', url: '/signin', minInteractive: 2 },
  { name: 'signup', url: '/signup', minInteractive: 4 },
  ...DASHBOARD_TABS.map((t) => ({ name: `tab=${t}`, url: `/dashboard?tab=${t}`, minInteractive: 10 })),
  ...SETTINGS_SUBTABS.map((s) => ({
    name: `settings/${s}`, url: `/dashboard?tab=settings&subtab=${s}`, minInteractive: 10,
  })),
]

interface Blocked {
  label: string
  tag: string
  rect: { x: number; y: number; w: number; h: number }
  coveredBy: string
}

async function findBlockedControls(page: Page): Promise<{ interactiveCount: number; blocked: Blocked[] }> {
  return page.evaluate(() => {
    // Phase two: a control is only unreachable if it is STILL covered once
    // scrolled to the middle of the viewport, away from top- and
    // bottom-anchored chrome.
    const stillCoveredWhenCentred = (el: Element, fixedOf: (n: Element | null) => Element | null) => {
      el.scrollIntoView({ block: 'center', inline: 'center' })
      const r = el.getBoundingClientRect()
      const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      if (!at || el.contains(at) || at === el) return null
      return fixedOf(at)
    }

    const SELECTOR = [
      'button', 'a[href]', 'input:not([type=hidden])', 'select', 'textarea',
      '[role=button]', '[role=link]', '[role=tab]', '[role=switch]', '[role=checkbox]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const isVisible = (el: Element) => {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false
      if (s.pointerEvents === 'none') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }

    // The nearest fixed ancestor, or null. An element inside a fixed container
    // is part of that overlay rather than a victim of it.
    const fixedAncestor = (el: Element | null): Element | null => {
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).position === 'fixed') return n
      }
      return null
    }

    const describe = (el: Element) =>
      `<${el.tagName.toLowerCase()}>` +
      (el.getAttribute('aria-label') ? ` "${el.getAttribute('aria-label')}"` : '') +
      (el.className && typeof el.className === 'string' ? ` .${el.className.split(/\s+/).slice(0, 3).join('.')}` : '')

    const all = Array.from(document.querySelectorAll(SELECTOR)).filter(isVisible)
    const blocked: Blocked[] = []

    for (const el of all) {
      if (fixedAncestor(el)) continue // part of an overlay, not covered by one

      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue

      // The point a click actually lands on. If what sits there belongs to a
      // fixed overlay, the control cannot be clicked.
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const atCentre = document.elementFromPoint(cx, cy)
      if (!atCentre || el.contains(atCentre) || atCentre === el) continue

      if (!fixedAncestor(atCentre)) continue

      // Candidate only. Confirm it cannot be reached by scrolling.
      const overlay = stillCoveredWhenCentred(el, fixedAncestor)
      if (!overlay) continue

      blocked.push({
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60) || '(no label)',
        tag: el.tagName.toLowerCase(),
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
        coveredBy: describe(overlay),
      })
    }

    return { interactiveCount: all.length, blocked }
  })
}

async function settle(page: Page) {
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(600)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
}

test.describe('no fixed element covers an interactive one', () => {
  for (const p of PAGES) {
    test(`${p.name}`, async ({ page, setupMockAuth, setupMockBrowse, setupMockOrgProfile }) => {
      await setupMockAuth()
      await setupMockBrowse()
      await setupMockOrgProfile()
      await page.addInitScript(() => {
        window.localStorage.setItem('grainlify_tour_seen_user-1', 'true')
        window.localStorage.setItem('patchwork_jwt', 'e2e-test-token')
      })

      await page.goto(p.url)
      await settle(page)

      const { interactiveCount, blocked } = await findBlockedControls(page)

      expect(
        interactiveCount,
        `${p.url} rendered only ${interactiveCount} interactive elements - it has not loaded, ` +
          `so the check below would pass without testing anything`,
      ).toBeGreaterThanOrEqual(p.minInteractive)

      if (blocked.length > 0) {
        const lines = blocked.map(
          (b) => `  <${b.tag}> "${b.label}" at ${b.rect.x},${b.rect.y} ${b.rect.w}x${b.rect.h}\n` +
                 `      covered by ${b.coveredBy}`,
        )
        throw new Error(
          `${blocked.length} interactive element(s) cannot be clicked on ${p.url} - ` +
          `a fixed-position element sits over their centre:\n${lines.join('\n')}`,
        )
      }
    })
  }
})
