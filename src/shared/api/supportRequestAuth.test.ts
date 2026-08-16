import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitSupportRequest } from './client'

/**
 * A support report from a signed-in user must carry their token.
 *
 * The endpoint is deliberately NOT behind auth middleware - somebody who
 * cannot sign in is exactly the person most likely to need support, so
 * anonymous reports are legitimate and a bad token is treated as anonymous
 * rather than rejected. Identity is resolved server-side by parsing the
 * Authorization header when one is present.
 *
 * Which means the whole mechanism rests on the header being sent. It was not:
 * apiRequest attaches it only when `requiresAuth` is set, that option defaults
 * to false, and submitSupportRequest did not set it. The token sat in
 * localStorage and never left the browser.
 *
 * Nothing failed. No error, no log, no 401 - the row saved with a null user_id
 * and looked exactly like a legitimate anonymous submission. All 8 support
 * requests in production were anonymous, including three sent from auth-gated
 * /dashboard pages, so every report from a signed-in user was unactionable.
 */
describe('submitSupportRequest identity', () => {
  const BASE_URL = 'http://localhost:8080'
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, support_id: 'sr-1', delivered: [] }),
    }) as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  function headersOfLastCall(): Record<string, string> {
    const [, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
    return (init?.headers ?? {}) as Record<string, string>
  }

  it('sends the stored JWT, so a signed-in reporter is identifiable', async () => {
    localStorage.setItem('patchwork_jwt', 'a-real-token')

    await submitSupportRequest({ category: 'bug', message: 'the page is broken' })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE_URL}/support-requests`)
    expect(headersOfLastCall()['Authorization']).toBe('Bearer a-real-token')
  })

  it('still submits with no token, because anonymous reports are legitimate', async () => {
    // Somebody who cannot sign in is the person most likely to need support.
    // Requiring a token here would lose exactly those reports.
    await expect(
      submitSupportRequest({ category: 'help', message: 'I cannot sign in' }),
    ).resolves.toEqual({ ok: true, support_id: 'sr-1', delivered: [] })

    expect(headersOfLastCall()['Authorization']).toBeUndefined()
  })
})
