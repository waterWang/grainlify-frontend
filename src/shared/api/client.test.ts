import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkHealth,
  getCurrentUser,
  updateProfile,
  unassignApplicant,
  getPublicProjects,
  getEcosystems,
  bootstrapAdmin,
  getGitHubLoginUrl,
  captureReferralCodeFromURL,
} from './client'

// This codebase's convention is 100% manual fetch mocking (no msw). The base
// URL is pinned to http://localhost:8080 via vitest.config.ts's `env` block,
// so exact-URL assertions below are deterministic.
const BASE_URL = 'http://localhost:8080'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    json: async () => body,
  } as unknown as Response
}

function nonOkJsonResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response
}

function nonOkUnparsableResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error('not valid json')
    },
  } as unknown as Response
}

function okUnparsableResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('not valid json')
    },
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

describe('apiRequest (exercised through the exported endpoint functions)', () => {
  it('sends default headers with no Content-Type or Authorization for a plain unauthenticated GET request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, service: 'patchwork-api' }))

    const result = await checkHealth()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE_URL}/health`)
    expect(init.headers).toEqual({})
    // apiRequest never injects a normalized "GET" back into the fetch call;
    // it just omits `method` and lets fetch's own default apply.
    expect(init.method).toBeUndefined()
    expect(result).toEqual({ ok: true, service: 'patchwork-api' })
  })

  it('adds Content-Type: application/json when a JSON body is sent, and Authorization when a token exists', async () => {
    localStorage.setItem('patchwork_jwt', 'tok-1')
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'ok' }))

    await updateProfile({ first_name: 'Ada' })

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(url).toBe(`${BASE_URL}/profile/update`)
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.headers['Authorization']).toBe('Bearer tok-1')
    expect(init.body).toBe(JSON.stringify({ first_name: 'Ada' }))
  })

  it('defaults Content-Type to application/json for a non-GET/HEAD request even when no body is sent', async () => {
    // Real, deliberate behavior (see the inline comment in client.ts above the
    // header logic): any non-GET/HEAD request without an explicit Content-Type
    // gets "application/json" by default, regardless of whether a body is
    // present. unassignApplicant sends a POST with no body at all.
    localStorage.setItem('patchwork_jwt', 'tok-2')
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))

    await unassignApplicant('proj-1', 42)

    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(url).toBe(`${BASE_URL}/projects/proj-1/issues/42/unassign`)
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBeUndefined()
  })

  it('omits the Authorization header when requiresAuth is true but no token is stored', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'u1', role: 'contributor' }))

    await getCurrentUser()

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('throws a friendly message and clears the stored token on a 401 response', async () => {
    localStorage.setItem('patchwork_jwt', 'expiring-token')
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(401, {}))

    await expect(getCurrentUser()).rejects.toThrow(
      'Authentication failed. Please sign in again.'
    )
    expect(localStorage.getItem('patchwork_jwt')).toBeNull()
  })

  it('throws the parsed error/message field for a generic non-OK error with a JSON body', async () => {
    // Regression coverage: the throw using the parsed message previously sat
    // INSIDE the try that guards response.json(), so it was immediately
    // caught by that same block's own catch and every backend error code
    // (this one, and every .includes(...)-based mapping built on it across
    // the app) silently never reached callers - only the generic
    // status-code fallback ever did. Fixed by moving the throw outside the
    // parse-guarding try.
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(500, { message: 'Server exploded' }))
    await expect(checkHealth()).rejects.toThrow('Server exploded')

    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(502, { error: 'github_installation_not_found' }))
    await expect(checkHealth()).rejects.toThrow('github_installation_not_found')
  })

  it('prefers message over error when a non-OK JSON body has both', async () => {
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(400, { message: 'human readable', error: 'machine_code' }))
    await expect(checkHealth()).rejects.toThrow('human readable')
  })

  it('falls back to a status-code message when a non-OK response body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(nonOkUnparsableResponse(502))

    await expect(checkHealth()).rejects.toThrow('API request failed with status 502')
  })

  it('throws a permission-denied message including the parsed error field for a 403 with a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(nonOkJsonResponse(403, { error: 'not_project_owner' }))

    await expect(checkHealth()).rejects.toThrow(
      'Permission denied: not_project_owner. You may need admin privileges to perform this action.'
    )
  })

  it('falls back to a generic permission-denied message for a 403 with a non-JSON body', async () => {
    fetchMock.mockResolvedValueOnce(nonOkUnparsableResponse(403))

    await expect(checkHealth()).rejects.toThrow(
      'Permission denied: You do not have permission to perform this action. Admin privileges may be required.'
    )
  })

  it('maps a network-level fetch rejection (TypeError mentioning fetch) to a friendly network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(checkHealth()).rejects.toThrow(
      'Network error: Unable to connect to the server. Please check your connection.'
    )
  })

  it('re-throws a non-network fetch rejection unchanged', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'))

    await expect(checkHealth()).rejects.toThrow('boom')
  })

  it('throws "Invalid response from server" when an OK response body is not valid JSON (non-projects endpoint)', async () => {
    fetchMock.mockResolvedValueOnce(okUnparsableResponse())

    await expect(checkHealth()).rejects.toThrow('Invalid response from server')
  })

  it('returns an empty array instead of throwing when a /projects response body is not valid JSON', async () => {
    fetchMock.mockResolvedValueOnce(okUnparsableResponse())

    const result = await getPublicProjects()

    expect(result).toEqual([])
  })
})

interface EndpointCase {
  name: string
  run: () => Promise<unknown>
  expectedUrl: string
  expectedMethod: string | undefined
  requiresAuth: boolean
  responseBody: unknown
}

const endpointCases: EndpointCase[] = [
  {
    name: 'getPublicProjects',
    run: () => getPublicProjects(),
    expectedUrl: `${BASE_URL}/projects`,
    expectedMethod: undefined,
    requiresAuth: false,
    responseBody: { projects: [], total: 0, limit: 20, offset: 0 },
  },
  {
    name: 'getEcosystems',
    run: () => getEcosystems(),
    expectedUrl: `${BASE_URL}/ecosystems`,
    expectedMethod: undefined,
    requiresAuth: false,
    responseBody: { ecosystems: [] },
  },
  {
    name: 'getCurrentUser',
    run: () => getCurrentUser(),
    expectedUrl: `${BASE_URL}/me`,
    expectedMethod: undefined,
    requiresAuth: true,
    responseBody: { id: 'u1', role: 'contributor' },
  },
  {
    name: 'updateProfile',
    run: () => updateProfile({ first_name: 'Ada' }),
    expectedUrl: `${BASE_URL}/profile/update`,
    expectedMethod: 'PUT',
    requiresAuth: true,
    responseBody: { message: 'ok' },
  },
  {
    name: 'bootstrapAdmin',
    run: () => bootstrapAdmin('boot-token'),
    expectedUrl: `${BASE_URL}/admin/bootstrap`,
    expectedMethod: 'POST',
    requiresAuth: true,
    responseBody: { ok: true, token: 't', role: 'admin' },
  },
]

describe('endpoint exports (table-driven spot checks)', () => {
  it.each(endpointCases)(
    '$name sends the expected method, URL, and auth header',
    async ({ run, expectedUrl, expectedMethod, requiresAuth, responseBody }) => {
      if (requiresAuth) {
        localStorage.setItem('patchwork_jwt', 'table-token')
      }
      fetchMock.mockResolvedValueOnce(jsonResponse(responseBody))

      await run()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ]
      expect(url).toBe(expectedUrl)
      expect(init.method).toBe(expectedMethod)
      if (requiresAuth) {
        expect(init.headers.Authorization).toBe('Bearer table-token')
      } else {
        expect(init.headers.Authorization).toBeUndefined()
      }
    }
  )
})

describe('referral code capture and injection', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('captureReferralCodeFromURL stores a "ref" query param into localStorage', () => {
    window.history.pushState({}, '', '/?ref=ABC123')
    captureReferralCodeFromURL()
    expect(window.localStorage.getItem('grainlify_ref_code')).toBe('ABC123')
  })

  it('captureReferralCodeFromURL does nothing when there is no "ref" param', () => {
    window.history.pushState({}, '', '/?foo=bar')
    captureReferralCodeFromURL()
    expect(window.localStorage.getItem('grainlify_ref_code')).toBeNull()
  })

  it('getGitHubLoginUrl includes "ref" when a code was previously captured', () => {
    window.history.pushState({}, '', '/?ref=XYZ789')
    captureReferralCodeFromURL()

    const url = new URL(getGitHubLoginUrl())
    expect(url.searchParams.get('ref')).toBe('XYZ789')
    expect(url.searchParams.get('redirect')).toBe(window.location.origin)
  })

  it('getGitHubLoginUrl omits "ref" when no code was ever captured', () => {
    const url = new URL(getGitHubLoginUrl())
    expect(url.searchParams.has('ref')).toBe(false)
  })
})
