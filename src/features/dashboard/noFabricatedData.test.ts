import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Contributor-facing components may not invent data.
 *
 * This is a guard against a specific failure that already shipped, not a style
 * preference. On the day we invited people to these pages, the Projects tab
 * rendered five projects nobody had contributed to - React Ecosystem, Next.js
 * Framework, Vue.js, Express.js, Django - with "My rewards" of "3,600 USD";
 * the Rewards tab listed seven payouts dated through 2025 with statuses of
 * "Complete" and "Processing" and amounts of the literal string
 * "--- undefined"; and Discover generated a "days left" deadline per issue with
 * Math.random(), so the same issue advertised a different deadline on every
 * reload. None of those files made a request of any kind.
 *
 * All of it contradicted what we were saying publicly - that no funded event
 * had run and nobody had been paid. A contributor reading the dashboard was
 * being told otherwise by our own UI.
 *
 * The shape of the mistake is detectable, which is the whole reason this file
 * exists: placeholder text, currency written as a literal, random numbers in a
 * render path, and arrays of well-known project names used as stand-ins. A test
 * catching the next one is cheaper than a contributor catching it.
 *
 * SCOPE is the contributor-facing surface. Admin-only screens are excluded on
 * purpose - DataPage still holds fabricated analytics behind an admin gate, and
 * fixing that is separate work that should not block this guard from protecting
 * the pages users actually see.
 */

const SCANNED_DIRS = [
  'src/features/dashboard',
  'src/features/leaderboard',
  'src/features/grainhack',
  'src/features/settings',
]

/** Admin-gated or otherwise not contributor-facing. Each entry needs a reason. */
const EXEMPT = new Map<string, string>([
  // Reachable only when activeRole === "admin", and handleRoleChange gates that
  // on the backend-verified userRole. Its fabricated charts are tracked
  // separately; listing it here keeps that debt visible rather than silent.
  ['src/features/dashboard/pages/DataPage.tsx', 'admin-gated; fabricated analytics tracked separately'],
])

/**
 * Placeholder strings that should never reach a user.
 *
 * Deliberately not a bare /"undefined"/: `typeof window === "undefined"` is a
 * legitimate SSR guard and appears six times in Dashboard.tsx alone. This
 * matches the dashed form that actually shipped in the Amount column, and
 * "undefined" only where it sits as an object-literal value - which is how a
 * placeholder gets into a data row.
 */
const PLACEHOLDER_TEXT = /"-{2,}\s*undefined"|:\s*"undefined"|\blorem ipsum\b/i

/** Currency written as a literal, e.g. "3,600 USD" or "$1,234". Real amounts
 *  arrive as numbers from an endpoint and are formatted at render. */
const CURRENCY_LITERAL = /"[\d][\d,]*(?:\.\d+)?\s*(?:USD|USDC)"|"\$[\d][\d,]{2,}/

/** Randomness in a component file. There is no legitimate reason for a
 *  contributor-facing view to invent a number: it makes the UI disagree with
 *  itself between renders. Also catches the unstable-React-key variant. */
const RANDOMNESS = /Math\.random\s*\(/

/**
 * Well-known OSS projects used as stand-in rows. Real project names arrive from
 * the API as github_full_name ("owner/repo"), never as a bare display name in
 * the source.
 *
 * No end-of-line anchor: the first version required the quoted name to end its
 * line, which matched the tab that shipped (one field per line) but missed the
 * same fabrication written inline. Verified zero legitimate occurrences of
 * these strings across the scanned directories before loosening it - the blog
 * and landing copy that legitimately name these projects are out of scope.
 */
const FAKE_PROJECT_ROWS =
  /(["'])(React Ecosystem|Next\.js Framework|Vue\.js|Express\.js|Django|Angular|Svelte)\1/

const RULES: Array<{ name: string; pattern: RegExp; why: string }> = [
  { name: 'placeholder text', pattern: PLACEHOLDER_TEXT, why: 'ship a real value or render nothing' },
  { name: 'hardcoded currency', pattern: CURRENCY_LITERAL, why: 'amounts come from an endpoint' },
  { name: 'Math.random()', pattern: RANDOMNESS, why: 'invented numbers disagree between renders' },
  { name: 'stand-in project name', pattern: FAKE_PROJECT_ROWS, why: 'project names come from the API' },
]

function walk(dir: string): string[] {
  let out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out = out.concat(walk(full))
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

/**
 * Strips block and line comments so prose explaining why a pattern was removed
 * does not itself trip the check. The rule is about what ships to the browser,
 * not what the file says about its own history - and these files now carry
 * exactly that kind of explanation.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const files = SCANNED_DIRS.flatMap(walk).filter((f) => !EXEMPT.has(relative(process.cwd(), f)))

describe('contributor-facing components do not invent data', () => {
  it('scans a non-empty set of files, so it cannot pass by finding nothing', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(RULES)('contains no $name', ({ pattern, why }) => {
    const offenders = files
      .filter((f) => pattern.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => relative(process.cwd(), f))

    expect(
      offenders,
      `Fabricated data in a contributor-facing component (${why}). ` +
        `If this is a false positive, narrow the pattern - do not add the file to EXEMPT ` +
        `unless it is genuinely not contributor-facing, with the reason written down.`,
    ).toEqual([])
  })

  it('keeps every exemption justified, so the list cannot grow silently', () => {
    for (const [path, reason] of EXEMPT) {
      expect(statSync(path).isFile(), `${path} is exempt but does not exist`).toBe(true)
      expect(reason.length, `${path} is exempt without a reason`).toBeGreaterThan(20)
    }
  })
})
