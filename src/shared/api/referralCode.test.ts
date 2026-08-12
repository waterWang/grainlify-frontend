import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  captureReferralCodeFromURL,
  readStoredReferralCode,
  clearStoredReferralCode,
} from './client'

const KEY = 'grainlify_ref_code'

/** The window the stubbed server issues tokens under. There is no constant
 *  for this in the frontend any more - the backend serves the figure and the
 *  client stores whatever it was told, which is the whole point. */
const SERVER_WINDOW_DAYS = 30

/** Stubs the capture endpoint, which now signs the code server-side. The
 *  token is opaque to the client, so tests assert on what is stored and sent
 *  rather than on its contents. */
function stubCapture(tokenFor: (code: string) => string = (c) => `signed(${c})`) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const code = new URL(url, 'http://localhost').searchParams.get('ref') ?? ''
    return {
      ok: true,
      status: 200,
      json: async () => ({ token: tokenFor(code), valid_days: SERVER_WINDOW_DAYS }),
    } as unknown as Response
  }))
}

async function landOn(url: string) {
  window.history.pushState({}, '', url)
  await captureReferralCodeFromURL()
}

describe('referral code capture window', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    window.history.pushState({}, '', '/')
    stubCapture()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('captures a code from the landing URL with its capture time', async () => {
    await landOn('/?ref=ABC123')
    expect(readStoredReferralCode()).toBe('signed(ABC123)')

    const stored = JSON.parse(localStorage.getItem(KEY)!)
    // What is stored is the SERVER-SIGNED token, not the bare code: the
    // client must not be able to backdate or edit its own capture.
    expect(stored.token).toBe('signed(ABC123)')
    expect(typeof stored.capturedAt).toBe('number')
    // The window is stored as the server issued it, not read from a constant
    // in this codebase that could disagree with the backend.
    expect(stored.validDays).toBe(SERVER_WINDOW_DAYS)
  })

  it('honours a window the server changes, rather than a hardcoded 30', async () => {
    // Proves the client is not carrying its own copy of the number: a
    // 7-day server window expires on day 8, with nothing in the frontend
    // edited to make that happen.
    stubCapture((c) => `signed(${c})`)
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ token: 'signed(SHORT)', valid_days: 7 }),
    } as unknown as Response)))

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await landOn('/?ref=SHORT')
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 6 * 86400_000)
    expect(readStoredReferralCode()).toBe('signed(SHORT)')

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + 8 * 86400_000)
    expect(readStoredReferralCode()).toBeNull()
  })

  it('stores nothing and throws nothing when the capture call fails', async () => {
    // The visitor sees a working page either way. A failed capture costs the
    // attribution, never the page load - and never the session.
    localStorage.setItem('patchwork_jwt', 'a-live-session')
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }))
    await expect(landOn('/?ref=NETWORKDOWN')).resolves.toBeUndefined()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(localStorage.getItem('patchwork_jwt')).toBe('a-live-session')
  })

  it('stores nothing when the capture call 401s, and keeps the session', async () => {
    // Regression guard: routed through the shared apiRequest helper, ANY 401
    // clears the stored JWT - so a hiccup on this public call would log out a
    // signed-in user who opened a referral link. It must not go through it.
    localStorage.setItem('patchwork_jwt', 'a-live-session')
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response)))
    await landOn('/?ref=UNAUTHORISED')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(localStorage.getItem('patchwork_jwt')).toBe('a-live-session')
  })

  it('ignores a URL with no ref, leaving any existing capture alone', async () => {
    await landOn('/?ref=KEEPME')
    await landOn('/some/other/page')
    expect(readStoredReferralCode()).toBe('signed(KEEPME)')
  })

  it('expires the code after the published window, measured from capture', async () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await landOn('/?ref=OLDCODE')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

    // One day inside the window: still good.
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (SERVER_WINDOW_DAYS - 1) * 86400_000)
    expect(readStoredReferralCode()).toBe('signed(OLDCODE)')

    // Past it: dropped. Someone who clicked a link months ago and signs up
    // today from an unrelated source has not been referred.
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (SERVER_WINDOW_DAYS + 1) * 86400_000)
    expect(readStoredReferralCode()).toBeNull()
    // And it is cleared, not merely ignored, so it cannot be honoured later.
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('clears the code once a signup completes', async () => {
    await landOn('/?ref=ONESHOT')
    expect(readStoredReferralCode()).toBe('signed(ONESHOT)')

    clearStoredReferralCode()

    // A second account created in the same browser must not credit the same
    // referrer again - that is a farming path, and referrals pay shares.
    expect(readStoredReferralCode()).toBeNull()
  })

  it('drops a legacy bare-string value, whose age is unknowable', () => {
    // Written before the code carried a capture time. Honouring it would mean
    // honouring an unbounded-age code, which is what the window exists to stop.
    localStorage.setItem(KEY, 'LEGACYCODE')
    expect(readStoredReferralCode()).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('drops the previous {code, capturedAt} shape, which held an unsigned code', () => {
    // Written by the first version of the window fix. It carries a bare code
    // the server will no longer accept, so honouring it would silently lose
    // the attribution at login instead of here.
    localStorage.setItem(KEY, JSON.stringify({ code: 'UNSIGNED', capturedAt: Date.now() }))
    expect(readStoredReferralCode()).toBeNull()
  })

  it('drops a corrupted value rather than throwing', () => {
    localStorage.setItem(KEY, '{not json')
    expect(readStoredReferralCode()).toBeNull()
  })

  it('a newer capture replaces an older one and restarts the window', async () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    await landOn('/?ref=FIRST')
    await landOn('/?ref=SECOND')

    // The stored entry is the later capture, and its window runs from then.
    expect(readStoredReferralCode()).toBe('signed(SECOND)')
  })
})
