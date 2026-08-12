import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  captureReferralCodeFromURL,
  readStoredReferralCode,
  clearStoredReferralCode,
  REFERRAL_CODE_TTL_DAYS,
} from './client'

const KEY = 'grainlify_ref_code'

function landOn(url: string) {
  window.history.pushState({}, '', url)
  captureReferralCodeFromURL()
}

describe('referral code capture window', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    window.history.pushState({}, '', '/')
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('captures a code from the landing URL with its capture time', () => {
    landOn('/?ref=ABC123')
    expect(readStoredReferralCode()).toBe('ABC123')

    const stored = JSON.parse(localStorage.getItem(KEY)!)
    // The timestamp is what the expiry is measured against, so it has to be
    // recorded at capture rather than inferred at use.
    expect(stored.code).toBe('ABC123')
    expect(typeof stored.capturedAt).toBe('number')
  })

  it('ignores a URL with no ref, leaving any existing capture alone', () => {
    landOn('/?ref=KEEPME')
    landOn('/some/other/page')
    expect(readStoredReferralCode()).toBe('KEEPME')
  })

  it('expires the code after the published window, measured from capture', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    landOn('/?ref=OLDCODE')

    // One day inside the window: still good.
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (REFERRAL_CODE_TTL_DAYS - 1) * 86400_000)
    expect(readStoredReferralCode()).toBe('OLDCODE')

    // Past it: dropped. Someone who clicked a link months ago and signs up
    // today from an unrelated source has not been referred.
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (REFERRAL_CODE_TTL_DAYS + 1) * 86400_000)
    expect(readStoredReferralCode()).toBeNull()
    // And it is cleared, not merely ignored, so it cannot be honoured later.
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('clears the code once a signup completes', () => {
    landOn('/?ref=ONESHOT')
    expect(readStoredReferralCode()).toBe('ONESHOT')

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

  it('drops a corrupted value rather than throwing', () => {
    localStorage.setItem(KEY, '{not json')
    expect(readStoredReferralCode()).toBeNull()
  })

  it('a newer capture replaces an older one and restarts the window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    landOn('/?ref=FIRST')

    vi.setSystemTime(new Date('2026-01-20T00:00:00Z'))
    landOn('/?ref=SECOND')

    // 25 days after the FIRST capture but only 6 after the second.
    vi.setSystemTime(new Date('2026-01-26T00:00:00Z'))
    expect(readStoredReferralCode()).toBe('SECOND')
  })
})
