import { describe, it, expect } from 'vitest'
import { parseCitations, citationUrl, segmentEvidence, prFilesUrl } from './citations'

describe('parseCitations', () => {
  it('extracts a line range', () => {
    const [c] = parseCitations('src/auth/LoginForm.tsx:44-61 adds regex validation')
    expect(c).toMatchObject({ path: 'src/auth/LoginForm.tsx', startLine: 44, endLine: 61 })
  })

  it('extracts a single line', () => {
    const [c] = parseCitations('internal/api/handler.go:12 guards the nil case')
    expect(c).toMatchObject({ path: 'internal/api/handler.go', startLine: 12, endLine: 12 })
  })

  it('accepts the L-prefixed form GitHub itself uses', () => {
    const [c] = parseCitations('pkg/x/y.go:L100-L120')
    expect(c).toMatchObject({ path: 'pkg/x/y.go', startLine: 100, endLine: 120 })
  })

  it('finds several citations in one evidence string', () => {
    const cs = parseCitations('Adds src/a.ts:10-20 and updates lib/b.go:5')
    expect(cs.map((c) => c.path)).toEqual(['src/a.ts', 'lib/b.go'])
  })

  // A false link is worse than a missing one: a reviewer who clicks through
  // to nothing stops trusting every other citation on the page.
  it('does not treat ordinary prose as a citation', () => {
    expect(parseCitations('Retries: 3 attempts, timeout: 30 seconds')).toHaveLength(0)
    expect(parseCitations('Rewrote retry handling in the payment worker.')).toHaveLength(0)
  })

  it('tolerates a reversed range rather than dropping the citation', () => {
    const [c] = parseCitations('src/a.ts:60-40')
    expect(c).toMatchObject({ startLine: 60, endLine: 60 })
  })

  it('returns nothing for empty evidence', () => {
    expect(parseCitations('')).toEqual([])
  })
})

describe('citationUrl', () => {
  const c = { path: 'src/auth/Login.tsx', startLine: 44, endLine: 61, raw: '', index: 0 }

  it('pins to the merge commit so the lines cannot drift', () => {
    expect(citationUrl('acme/widgets', c, 'abc123')).toBe(
      'https://github.com/acme/widgets/blob/abc123/src/auth/Login.tsx#L44-L61',
    )
  })

  it('falls back to HEAD when no merge commit is recorded', () => {
    expect(citationUrl('acme/widgets', c, null)).toContain('/blob/HEAD/')
  })

  it('uses a single-line anchor for a single-line citation', () => {
    expect(citationUrl('acme/widgets', { ...c, endLine: 44 }, 'abc123')).toMatch(/#L44$/)
  })
})

describe('segmentEvidence', () => {
  it('splits prose from citations so both survive rendering', () => {
    const segs = segmentEvidence('Adds validation at src/a.ts:10-20 as required.')
    expect(segs.map((s) => s.text)).toEqual(['Adds validation at ', 'src/a.ts:10-20', ' as required.'])
    expect(segs[0].citation).toBeUndefined()
    expect(segs[1].citation).toMatchObject({ path: 'src/a.ts', startLine: 10 })
  })

  it('returns a single plain segment when there is nothing to link', () => {
    expect(segmentEvidence('No file reference here.')).toEqual([{ text: 'No file reference here.' }])
  })

  it('returns nothing for empty evidence', () => {
    expect(segmentEvidence('')).toEqual([])
  })
})

describe('prFilesUrl', () => {
  it('points at the PR diff for citations with no line reference', () => {
    expect(prFilesUrl('acme/widgets', 42)).toBe('https://github.com/acme/widgets/pull/42/files')
  })
})
