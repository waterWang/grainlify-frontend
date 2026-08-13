import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkHealth } from './client'
import { isApiError } from './apiError'

// The compatibility claim the ApiError change rests on.
//
// apiRequest used to end every failed request with
// `throw new Error(errorData?.message || errorData?.error || ...)`. One throw
// now raises ApiError instead, so the response body survives for callers that
// want it - the KYC 409 carries the url of the session the user already has,
// and that field was being discarded.
//
// The claim is that `e.message` is unchanged for every caller. Dozens of
// `catch (e) => e.message` sites and every `.includes('some_error_code')`
// mapping in the app depend on it, and until now it rested on reading the
// diff rather than on a test.
//
// These assertions are deliberately byte-exact string literals rather than
// expressions built from the same source the implementation uses. A test that
// recomputes the message the same way the code does cannot detect a change to
// how it is computed.
//
// They compare `.message` rather than using `rejects.toThrow(new Error(...))`,
// because that form asserts the CLASS as well - and the class is the one thing
// that deliberately changed. Written that way first, it failed on exactly the
// three cases the change touches, which is the assertion being wrong rather
// than the code.

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  localStorage.clear()
})

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: false, status, json: async () => body }) as unknown as Response

/** The claim under test: the message string, independent of the error class. */
const messageOf = async (p: Promise<unknown>) => {
  const e = await p.catch((err) => err)
  if (!(e instanceof Error)) throw new Error(`expected an Error, got ${String(e)}`)
  return e.message
}

const unparsable = (status: number) =>
  ({
    ok: false,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    },
  }) as unknown as Response

describe('ApiError keeps e.message byte-identical to the old Error', () => {
  it('a structured body with message prefers message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: 'Server exploded', error: 'machine_code' }))
    expect(await messageOf(checkHealth())).toBe('Server exploded')
  })

  it('a structured body with only error uses error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(502, { error: 'github_installation_not_found' }))
    expect(await messageOf(checkHealth())).toBe('github_installation_not_found')
  })

  it('a structured body with neither falls back to the generic sentence', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { unrelated: true }))
    expect(await messageOf(checkHealth())).toBe('API request failed')
  })

  it('an unparsable body falls back to the status-code sentence', async () => {
    fetchMock.mockResolvedValueOnce(unparsable(502))
    expect(await messageOf(checkHealth())).toBe('API request failed with status 502')
  })

  it('a network failure is unchanged and is NOT an ApiError', async () => {
    // There is no response, so there is no status and no body to carry. This
    // path still throws a plain Error, and a caller narrowing on ApiError must
    // not accidentally swallow a connectivity problem as an HTTP one.
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await messageOf(checkHealth())).toBe(
      'Network error: Unable to connect to the server. Please check your connection.',
    )

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const err = await checkHealth().catch((e) => e)
    expect(isApiError(err)).toBe(false)
  })

  it('401 and 403 are unchanged, including both 403 parse paths', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}))
    expect(await messageOf(checkHealth())).toBe('Authentication failed. Please sign in again.')

    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'not_project_owner' }))
    expect(await messageOf(checkHealth())).toBe(
      'Permission denied: not_project_owner. You may need admin privileges to perform this action.',
    )

    fetchMock.mockResolvedValueOnce(unparsable(403))
    expect(await messageOf(checkHealth())).toBe(
      'Permission denied: You do not have permission to perform this action. Admin privileges may be required.',
    )
  })
})

describe('ApiError carries what the old Error threw away', () => {
  it('exposes status and the parsed body, which is the point of the change', async () => {
    // The real case: the KYC endpoint answers 409 with the url of the session
    // the user already has. Under the old code this reached the caller as a
    // sentence and the url was gone.
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        error: 'kyc_session_exists',
        status: 'pending',
        url: 'https://verify.example/session/abc',
      }),
    )

    const err = await checkHealth().catch((e) => e)

    expect(err.message).toBe('kyc_session_exists')
    expect(isApiError(err)).toBe(true)
    expect(err.status).toBe(409)
    expect(err.data?.url).toBe('https://verify.example/session/abc')
  })

  it('is still an Error, so untouched callers keep working', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: 'Server exploded' }))
    const err = await checkHealth().catch((e) => e)

    expect(err).toBeInstanceOf(Error)
    expect(String(err)).toBe('ApiError: Server exploded')
    expect(`${err.message}`).toBe('Server exploded')
  })
})
