import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'

/**
 * Assert that a rendered tree contains no persistently-animated element.
 *
 * ## Why this exists rather than checking one class
 *
 * Two Leaderboard tests used to assert that exactly one `.animate-shimmer`
 * element survived once the skeletons cleared — the hero's decorative
 * underline. When that underline was removed the assertion became `toBe(0)`,
 * which was correct but only by coincidence: it still watched a single class,
 * so re-adding `animate-float` or `animate-twinkle-slow` to the same page would
 * have sailed past it. An assertion that happens to be right is one that has
 * quietly stopped testing anything.
 *
 * This checks the property the tier rules actually care about — *nothing on
 * this page animates forever* — against every infinite animation the codebase
 * defines, so it keeps working as new ones are added.
 *
 * ## How the class list is derived
 *
 * Scraped from the stylesheets rather than hardcoded, because a hardcoded list
 * silently weakens the moment someone adds a keyframe. Two sources:
 *
 *  - `src/styles/theme.css`
 *  - `<style>` blocks inside components (LeaderboardStyles and friends), which
 *    is where several page-local animations live
 *
 * plus Tailwind's own built-in infinite utilities, which have no rule in our
 * CSS to scrape.
 *
 * ## What it does not cover
 *
 * jsdom does not run animations or resolve `getAnimations()`, so this is a
 * class-name check, not a runtime one. Inline `style={{ animation: ... }}` and
 * JS-driven animation are invisible to it. The runtime audit in the per-page
 * screenshot harness is what covers those; see docs/design-system.md.
 */

const TAILWIND_INFINITE = ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce']

function collectSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectSources(full, out)
    else if (/\.(css|tsx)$/.test(full) && !/\.test\.tsx$/.test(full)) out.push(full)
  }
  return out
}

let cached: string[] | null = null

/** Every `.animate-x` class in the codebase whose animation runs `infinite`. */
export function infiniteAnimationClasses(): string[] {
  if (cached) return cached
  const found = new Set(TAILWIND_INFINITE)
  for (const file of collectSources('src')) {
    const text = readFileSync(file, 'utf8')
    if (!text.includes('infinite')) continue
    for (const m of text.matchAll(/\.(animate-[a-z0-9-]+)\s*\{([^}]*)\}/g)) {
      if (/animation:[^;]*\binfinite\b/.test(m[2])) found.add(m[1])
    }
  }
  cached = [...found]
  return cached
}

/**
 * Fails if any element under `container` carries a class that animates forever.
 */
export function expectNoPersistentAnimation(container: HTMLElement): void {
  const classes = infiniteAnimationClasses()
  // A scrape that finds nothing would make this pass vacuously.
  expect(
    classes.length,
    'No infinite animation classes were found in the stylesheets — the scrape has broken',
  ).toBeGreaterThan(TAILWIND_INFINITE.length)

  const offenders: string[] = []
  for (const cls of classes) {
    for (const el of container.querySelectorAll(`.${CSS.escape(cls)}`)) {
      offenders.push(`${el.tagName.toLowerCase()}.${cls}`)
    }
  }

  expect(
    offenders,
    'Elements are animating persistently on a surface that should be still.\n' +
      'Tier B and below are scanning surfaces: nothing should move behind a list ' +
      'someone is reading. See docs/design-system.md.',
  ).toEqual([])
}
