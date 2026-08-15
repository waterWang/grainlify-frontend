// Shared machinery for every generated brand asset: share cards, banners,
// avatars.
//
// The three families differ only in geometry. The parts that must not drift
// between them - where colour comes from, which logo path is authoritative,
// what counts as passing contrast, and how a rendered asset is measured - live
// here once, so a new asset family cannot quietly opt out of the checks.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.join(__dirname, '..', '..')

// ---------------------------------------------------------------------------
// brand.css is the palette. Parse it; never restate it.
// ---------------------------------------------------------------------------

/**
 * Pulls the custom properties out of one CSS block.
 *
 * Deliberately narrow: it reads the `:root {...}` and `.dark {...}` blocks of
 * one known file, rather than pretending to be a CSS parser. A general parser
 * here would be more code and no more correct for the one input it ever sees.
 */
function readBlock(css, selector) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`brand.css: no "${selector}" block`)
  const end = css.indexOf('}', start)
  const body = css.slice(start, end)
  const out = {}
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim()
  }
  return out
}

const brandCss = readFileSync(path.join(repoRoot, 'src', 'styles', 'brand.css'), 'utf8')
const blocks = { root: readBlock(brandCss, ':root'), dark: readBlock(brandCss, '.dark') }

/** Resolves a `{ block, token }` role spec to a literal colour, or fails loudly. */
export function colourFor(spec, roleName) {
  if (!spec) throw new Error(`content.mjs: unknown role "${roleName}"`)
  const value = blocks[spec.block]?.[spec.token]
  if (!value) {
    throw new Error(
      `brand.css: ${spec.token} is not defined in ${spec.block === 'root' ? ':root' : '.dark'}. ` +
        `A generated asset reads it for the "${roleName}" role.`,
    )
  }
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    // Contrast is computed below, and compositing an alpha channel against an
    // unknown backdrop is exactly the mistake that made the first landing
    // audit wrong twice. Refuse rather than guess.
    throw new Error(`brand.css: ${spec.token} is "${value}"; generated assets need an opaque 6-digit hex.`)
  }
  return value
}

/** Resolves a whole `{ role: spec }` map, printing where each colour came from. */
export function resolvePalette(roles, label) {
  const out = {}
  for (const [role, spec] of Object.entries(roles)) out[role] = colourFor(spec, role)
  console.log(`\nPalette for ${label}, read from src/styles/brand.css`)
  for (const [role, value] of Object.entries(out)) {
    const spec = roles[role]
    console.log(`  ${role.padEnd(9)} ${value}  <- ${spec.token} (${spec.block === 'root' ? ':root' : '.dark'})`)
  }
  return out
}

// ---------------------------------------------------------------------------
// The real logo, not a redraw.
// ---------------------------------------------------------------------------

const logoSrc = readFileSync(path.join(repoRoot, 'src', 'assets', 'grainlify_log.svg'), 'utf8')
const viewBox = logoSrc.match(/viewBox="([^"]+)"/)?.[1]
// The one glyph path. The source also carries a luminance mask whose own path
// is a plain rect covering the entire viewBox (M0 0H28.7655V26.3255H0V0Z) - a
// full-coverage no-op - so the mark is reproduced exactly without it.
const glyph = logoSrc.match(/<path d="(M11\.[^"]+)"/)?.[1]
if (!viewBox || !glyph) {
  throw new Error('grainlify_log.svg: could not extract the mark. Was the asset replaced?')
}
const [, , vbW, vbH] = viewBox.split(/\s+/).map(Number)

export const logo = { path: glyph, vbW, vbH }

// ---------------------------------------------------------------------------
// Contrast. A gate, not a comment.
// ---------------------------------------------------------------------------

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0')

/**
 * Flattens translucent layers onto an opaque base, in paint order.
 *
 * A background texture is not decoration as far as contrast is concerned: text
 * crossing a gold dot sits on a lighter ground than the one the palette says
 * it sits on. Auditing against the base colour alone is how the landing audit
 * was wrong twice - it measured white-on-gold against the page behind the
 * button rather than against the button. The worst case is cheap to compute,
 * so it gets computed rather than reasoned about.
 */
export function compositeOver(base, layers) {
  let [r, g, b] = channels(base)
  for (const { colour, alpha } of layers) {
    const [lr, lg, lb] = channels(colour)
    r = alpha * lr + (1 - alpha) * r
    g = alpha * lg + (1 - alpha) * g
    b = alpha * lb + (1 - alpha) * b
  }
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`
}

/**
 * Audits a list of `{ what, fg, bg, px, bold, graphic }` pairs and THROWS on
 * any failure, so a failing asset is never written.
 *
 * The required ratio is derived from the actual font size rather than assumed.
 * Every headline on these assets is far above the 24px large-text boundary
 * today, but a future copy change that drops a line to 16px must start being
 * held to 4.5 without anyone remembering to update this. Non-text marks are
 * held to WCAG 1.4.11's 3.0.
 */
export function auditContrast(pairs, label) {
  const rows = pairs.map((p) => {
    const required = p.graphic ? 3 : p.px >= 24 || (p.px >= 18.66 && p.bold) ? 3 : 4.5
    const ratio = contrast(p.fg, p.bg)
    return { ...p, required, ratio, pass: ratio >= required }
  })

  console.log(`\nContrast — ${label} (WCAG AA)`)
  for (const r of rows) {
    console.log(
      `  ${r.pass ? 'PASS' : 'FAIL'}  ${r.ratio.toFixed(2).padStart(5)} : 1  (needs ${r.required})` +
        `  ${r.fg} on ${r.bg}  ${r.what}`,
    )
  }
  const failures = rows.filter((r) => !r.pass)
  if (failures.length) {
    throw new Error(`${failures.length} pair(s) fail WCAG AA in ${label}. Assets not written.`)
  }
  console.log(`  ${rows.length} pairs, 0 failures.`)
}

// ---------------------------------------------------------------------------
// Markup helpers.
// ---------------------------------------------------------------------------

/** Escapes text for XML. The copy is ours, but an apostrophe or & should not
 *  be able to produce a malformed file. */
export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The product's own stack, so a viewer without Inter degrades to the same
 *  fallback the site itself uses (src/styles/fonts.css). */
export const FONT_STACK = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif`

export const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&amp;display=swap');`

// ---------------------------------------------------------------------------
// Render and measure.
// ---------------------------------------------------------------------------

/**
 * Loads one SVG in Chromium, waits for the real font, measures every drawn
 * element, and writes the PNG.
 *
 * Measuring here rather than estimating in Node is the point: a standalone SVG
 * neither wraps nor shrinks its text, so an over-long line runs off the asset
 * silently — and an approximated advance-width table is wrong by enough to
 * both miss a real overflow and invent one that is not there.
 *
 * Boxes come back in canvas coordinates via getBoundingClientRect, which
 * accounts for the transform on the logo group. getBBox would report the
 * mark's untransformed local box and quietly pass a mark drawn off-canvas.
 */
export async function renderOne(browser, { svgPath, pngPath, width, height, scale = 2 }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  })
  const page = await ctx.newPage()
  await page.goto(`file://${svgPath}`)
  // Without this the screenshot can catch the fallback font mid-swap.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)

  // Ask about the weights this asset actually uses, not a fixed probe. Faces
  // load lazily: checking a hardcoded "700 64px Inter" reports FALLBACK on an
  // asset whose heaviest text is 600, which is a false alarm about the one
  // thing this check exists to catch.
  const usedInter = await page.evaluate(() => {
    const texts = [...document.querySelectorAll('text')]
    if (!texts.length) return null // avatars carry no text
    return texts.every((el) => {
      const cs = getComputedStyle(el)
      return document.fonts.check(`${cs.fontWeight} ${cs.fontSize} Inter`)
    })
  })

  // [data-decorative] is background art - a faint ghost mark, a texture tile.
  // It is *meant* to bleed into the avatar overlay and off the safe edge, so
  // measuring it would fail every banner for doing its job. Content only.
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('text:not([data-decorative]), path:not([data-decorative]), rect:not([data-decorative])')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        kind: el.tagName.toLowerCase(),
        // The class doubles as the element's role, so a check can ask for
        // "the display number" rather than matching on its text - which would
        // break the moment the copy changes.
        cls: el.getAttribute('class') ?? '',
        label: (el.textContent || 'mark').slice(0, 34),
        left: Math.round(r.left),
        right: Math.round(r.right),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
      }
    }),
  )

  // pngPath is optional: the avatar centring pass renders the bare mark purely
  // to measure its painted bounds, and should not leave a file behind.
  if (pngPath) await page.screenshot({ path: pngPath })
  await ctx.close()
  return { boxes, usedInter }
}

/** Collects violations rather than throwing per-asset, so one run reports every
 *  problem instead of only the first. */
export function reportProblems(problems, advice) {
  if (!problems.length) return false
  console.error(`\nGeometry violations:`)
  for (const p of problems) console.error(`  ${p}`)
  console.error(`\n${advice}`)
  return true
}
