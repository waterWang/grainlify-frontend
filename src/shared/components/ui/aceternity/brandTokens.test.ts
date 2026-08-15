import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * The shared design layer may not contain colour literals.
 *
 * Every colour these components use has to come from a --brand-* custom
 * property (src/styles/brand.css), because that is the only way a theme switch
 * moves all of them and a palette change is one edit rather than a hunt.
 *
 * This is a guard against a specific, likely mistake rather than a style
 * preference. Aceternity components are copy-in, and they arrive in indigo and
 * violet with the colours written directly into the JSX. Pasting one in and
 * "fixing the colours" by swapping its hexes for ours produces something that
 * looks right today and silently stops following the theme — which is exactly
 * the state this directory was in before these tokens existed, and exactly what
 * the existing shadcn tokens in theme.css already suffer from: defined, wrong
 * in dark mode, and read by nothing.
 *
 * Scope is deliberately the shared design layer only. The wider codebase holds
 * roughly 1,205 occurrences of #c9983a across 126 files; policing that is a
 * separate migration and not something a test should fail on today. Add new
 * shared-layer directories to SCANNED_DIRS as they are created — a directory
 * that is not listed here is not protected.
 */

const SCANNED_DIRS = [
  'src/shared/components/ui/aceternity',
]

/** Any hex colour: #abc, #aabbcc, #aabbccdd. */
const HEX = /#[0-9a-fA-F]{3,8}\b/g

/** rgb()/rgba()/hsl()/hsla() with literal numbers in them. */
const FUNCTIONAL_COLOUR = /\b(?:rgba?|hsla?)\s*\(\s*[\d.]/g

/** Tailwind's own named colour utilities, e.g. bg-indigo-500, text-white/80. */
const NAMED_UTILITY =
  /\b(?:bg|text|border|from|via|to|fill|stroke|ring|shadow|decoration|outline|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b(?:\/\d+)?/g

function walk(dir: string): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full))
    } else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Strips block and line comments so prose explaining *why* a colour was
 * rejected does not itself trip the check. The rule is about what ships to the
 * browser, not what the file says.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('shared design layer uses brand tokens, not literal colours', () => {
  const files = SCANNED_DIRS.flatMap(walk)

  it('scans a non-empty set of files, so it cannot pass by finding nothing', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s carries no colour of its own', (file) => {
    const source = stripComments(readFileSync(file, 'utf8'))
    const rel = relative(process.cwd(), file)

    const hex = source.match(HEX) ?? []
    const functional = source.match(FUNCTIONAL_COLOUR) ?? []
    const named = source.match(NAMED_UTILITY) ?? []
    const found = [...hex, ...functional, ...named]

    expect(
      found,
      `${rel} contains colour literals: ${found.join(', ')}\n\n` +
        'Shared design components must read colour from a --brand-* custom ' +
        'property in src/styles/brand.css. If the palette needs a value it ' +
        'does not have yet, add the token there rather than inlining it here — ' +
        'a colour baked into a component stops following the theme.',
    ).toEqual([])
  })
})

describe('brand.css defines every token the shared layer reads', () => {
  const css = readFileSync('src/styles/brand.css', 'utf8')
  const files = SCANNED_DIRS.flatMap(walk)

  const referenced = new Set<string>()
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/var\((--brand-[a-z0-9-]+)\)/g)) {
      referenced.add(m[1])
    }
  }

  it('references at least one brand token', () => {
    expect(referenced.size).toBeGreaterThan(0)
  })

  it.each([...referenced])('%s is defined', (token) => {
    // A component reading an undefined custom property renders transparent,
    // which is invisible in review and obvious only in production.
    expect(css).toContain(`${token}:`)
  })

  it('redefines theme-dependent tokens under .dark', () => {
    const dark = css.slice(css.indexOf('.dark {'))
    // These must differ per theme; a token defined only in :root would keep its
    // light value in dark mode, which is the failure this whole file exists for.
    for (const token of ['--brand-ink', '--brand-hairline', '--brand-glass', '--brand-aurora-1']) {
      expect(dark, `${token} is not overridden in .dark`).toContain(`${token}:`)
    }
  })
})
