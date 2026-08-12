import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

/**
 * Nothing inside a backdrop-blur surface may animate persistently.
 *
 * A backdrop filter samples what is painted behind it. Anything changing inside
 * that panel invalidates the sample, so the blur is recomputed across the whole
 * panel every frame — the cost scales with the size of the glass, not with the
 * size of the thing animating. Two 2px rings pulsing opacity inside Discover's
 * banner took it from ~120 FPS idle to ~40. See docs/design-system.md.
 *
 * WHAT THIS CATCHES
 * -----------------
 * A persistently-animated element inside a backdrop-blur element, where both
 * appear in the same file's JSX. Ancestry is resolved with the TypeScript
 * parser rather than guessed from a regex, so "inside" means actually inside.
 *
 * WHAT THIS CANNOT CATCH, AND WHY IT IS SAID OUT LOUD
 * ---------------------------------------------------
 * Composition across files. `<GlassCard><Pulse /></GlassCard>` puts the blur in
 * one file and the animation in another, and no single-file check can see that.
 * That is the *more likely* failure once a shared glass component exists, so
 * this test is a floor, not the whole guarantee.
 *
 * The complete check is a runtime one and lives in the per-page verification
 * harness: load the page in a browser, find every element with a backdrop
 * filter, and assert no descendant returns a running animation from
 * getAnimations(). That sees through composition because it inspects the real
 * DOM. It runs when a page is measured rather than on every `vitest` run, which
 * is why both exist.
 *
 * ONE-SHOT ANIMATIONS ARE ALLOWED
 * -------------------------------
 * Only *persistent* animation is flagged: Tailwind's infinite utilities, our
 * own `.animate-*` classes declared `infinite` in theme.css, and motion props
 * with `repeat: Infinity`. A card fading in on mount costs a bounded amount
 * once. `transition-*` on hover is covered by the written rule but deliberately
 * not failed here — it appears on hundreds of elements across the codebase and
 * flagging it would produce noise nobody reads, which is worse than a rule
 * people apply by hand.
 */

/** Shared layer, plus pages as they are migrated to the design system. */
const SCANNED_PATHS = [
  'src/shared/components/ui/aceternity',
  'src/features/dashboard/pages/DiscoverPage.tsx',
  'src/features/dashboard/pages/DiscoverHero.tsx',
]

/** Tailwind utilities whose keyframes run forever. */
const TAILWIND_INFINITE = ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce']

/** Our own `.animate-x` rules declared `infinite`, read from the stylesheet so
 *  this cannot drift out of date when a new one is added. */
function projectInfiniteClasses(): string[] {
  const css = readFileSync('src/styles/theme.css', 'utf8')
  const found: string[] = []
  for (const m of css.matchAll(/\.(animate-[a-z0-9-]+)\s*\{([^}]*)\}/g)) {
    if (/animation:[^;]*\binfinite\b/.test(m[2])) found.push(m[1])
  }
  return found
}

function walk(path: string): string[] {
  if (statSync(path).isFile()) return /\.tsx$/.test(path) ? [path] : []
  return readdirSync(path).flatMap((entry) => {
    const full = join(path, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx$/.test(full) && !/\.test\.tsx$/.test(full) ? [full] : []
  })
}

/** Every attribute of a JSX tag flattened to text, so template literals and
 *  conditional class strings are searchable. */
function tagText(node: ts.JsxOpeningLikeElement): string {
  return node.attributes.getText()
}

const isGlass = (text: string) => text.includes('backdrop-blur')

function persistentAnimation(text: string, infiniteClasses: string[]): string | null {
  for (const cls of infiniteClasses) {
    // Word boundary so `animate-pulse` does not match `animate-pulse-slow`
    // unless that class is itself declared infinite (in which case it is in
    // the list on its own).
    if (new RegExp(`\\b${cls}\\b`).test(text)) return cls
  }
  if (/repeat:\s*Infinity/.test(text)) return 'repeat: Infinity'
  if (/animation:[^"'`]*\binfinite\b/.test(text)) return 'inline animation: infinite'
  return null
}

interface Violation {
  file: string
  animated: string
  line: number
}

function findViolations(file: string, infiniteClasses: string[]): Violation[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const violations: Violation[] = []
  let glassDepth = 0

  const visit = (node: ts.Node) => {
    let opened = false

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      const text = tagText(opening)

      const animated = persistentAnimation(text, infiniteClasses)
      // An animation on the glass element itself is fine — it is the *contents*
      // changing that invalidates the backdrop sample.
      if (animated && glassDepth > 0) {
        violations.push({
          file,
          animated,
          line: source.getLineAndCharacterOfPosition(opening.getStart()).line + 1,
        })
      }

      if (isGlass(text)) {
        glassDepth++
        opened = true
      }
    }

    ts.forEachChild(node, visit)
    if (opened) glassDepth--
  }

  visit(source)
  return violations
}

describe('no persistent animation inside a backdrop-blur surface', () => {
  const infiniteClasses = [...TAILWIND_INFINITE, ...projectInfiniteClasses()]
  const files = SCANNED_PATHS.flatMap(walk)

  it('knows which classes animate forever', () => {
    // If this drops to the Tailwind defaults, the stylesheet scrape has broken
    // and the check silently weakens.
    expect(infiniteClasses.length).toBeGreaterThan(TAILWIND_INFINITE.length)
  })

  it('scans a non-empty set of files', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s keeps motion out of its glass', (file) => {
    const violations = findViolations(file, infiniteClasses)
    const described = violations.map(
      (v) => `${relative(process.cwd(), v.file)}:${v.line} — ${v.animated}`,
    )

    expect(
      described,
      'A persistently animated element sits inside a backdrop-blur surface.\n' +
        'The blur is recomputed across the whole panel every frame; the cost ' +
        'scales with the size of the glass, not the size of the moving thing.\n' +
        'Move the animation outside the blurred container, or drop the blur.\n' +
        'See docs/design-system.md, "No animation inside glass".',
    ).toEqual([])
  })
})
