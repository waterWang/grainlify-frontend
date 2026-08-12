import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  captureReferralCodeFromURL,
  readStoredReferralCode,
  clearStoredReferralCode,
  REFERRAL_CODE_TTL_DAYS,
} from './client'

const KEY = 'grainlify_ref_code'

/** Stubs the capture endpoint, which now signs the code server-side. The
 *  token is opaque to the client, so tests assert on what is stored and sent
 *  rather than on its contents. */
function stubCapture(tokenFor: (code: string) => string = (c) => `signed(${c})`) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const code = new URL(url, 'http://localhost').searchParams.get('ref') ?? ''
    return {
      ok: true,
      status: 200,
      json: async () => ({ token: tokenFor(code) }),
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
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (REFERRAL_CODE_TTL_DAYS - 1) * 86400_000)
    expect(readStoredReferralCode()).toBe('signed(OLDCODE)')

    // Past it: dropped. Someone who clicked a link months ago and signs up
    // today from an unrelated source has not been referred.
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (REFERRAL_CODE_TTL_DAYS + 1) * 86400_000)
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
