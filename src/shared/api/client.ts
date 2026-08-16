/**
 * API Client for Patchwork Backend
 * Base URL: http://7nonainmv1.loclx.io
 */

import { API_BASE_URL } from "../config/api";
import { ApiError } from './apiError';
export { ApiError, isApiError } from './apiError';


// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem("patchwork_jwt");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("patchwork_jwt", token);
  // Notify app code (AuthContext) immediately, since storage events don't fire
  // in the same tab that performed the write.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("patchwork-auth-token", { detail: { token } }),
    );
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("patchwork_jwt");
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("patchwork-auth-token", { detail: { token: null } }),
    );
  }
};

// API request helper
interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { requiresAuth = false, headers = {}, ...fetchOptions } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  if (endpoint === "/ecosystems") {
    console.log("API Request - URL:", url);
    console.log("API Request - API_BASE_URL:", API_BASE_URL);
    console.log("API Request - endpoint:", endpoint);
  }
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Avoid forcing CORS preflight for simple GET/HEAD requests by only setting
  // Content-Type when we actually send a JSON body.
  const method = (fetchOptions.method || "GET").toUpperCase();
  const hasBody = fetchOptions.body !== undefined && fetchOptions.body !== null;
  if (hasBody && !(fetchOptions.body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  } else if (
    method !== "GET" &&
    method !== "HEAD" &&
    !("Content-Type" in requestHeaders)
  ) {
    // Non-GET/HEAD without an explicit content-type: default to JSON for our API.
    requestHeaders["Content-Type"] = "application/json";
  }

  // Add auth token if required
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    if (endpoint === "/ecosystems") {
      console.log("API Request - Making fetch call to:", url);
      console.log("API Request - Headers:", requestHeaders);
    }
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });
    if (endpoint === "/ecosystems") {
      console.log("API Request - Response status:", response.status);
      console.log("API Request - Response ok:", response.ok);
    }
  } catch (err) {
    // Network error (CORS, connection refused, etc.)
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(
        "Network error: Unable to connect to the server. Please check your connection.",
      );
    }
    throw err;
  }

  // Handle errors
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid - clear it
      removeAuthToken();
      throw new Error("Authentication failed. Please sign in again.");
    }

    if (response.status === 403) {
      // Forbidden - user doesn't have permission. Same fix as the generic
      // branch below: the throw using the parsed message must sit outside
      // the try that guards response.json(), or it's caught by this same
      // block's own catch and the specific message never reaches the caller.
      let forbiddenData: { message?: string; error?: string } | undefined;
      try {
        forbiddenData = await response.json();
      } catch {
        throw new Error(
          "Permission denied: You do not have permission to perform this action. Admin privileges may be required.",
        );
      }
      const errorMsg =
        forbiddenData?.message || forbiddenData?.error || "Access forbidden";
      throw new Error(
        `Permission denied: ${errorMsg}. You may need admin privileges to perform this action.`,
      );
    }

    // Try to parse error response. The throw for the parsed message must sit
    // outside this try block - throwing it from inside was being caught by
    // this same block's own catch, so the parsed backend error code (and
    // every .includes(...)-based frontend mapping built on it, across every
    // feature) never actually reached callers; only the generic status-code
    // fallback below ever did.
    let errorData: { message?: string; error?: string } | undefined;
    try {
      errorData = await response.json();
    } catch {
      throw new Error(`API request failed with status ${response.status}`);
    }
    throw new ApiError(
      errorData?.message || errorData?.error || "API request failed",
      response.status,
      errorData as Record<string, unknown> | undefined,
    );
  }

  // Parse JSON response
  try {
    const jsonData = await response.json();
    if (endpoint === "/ecosystems") {
      console.log("API Request - Parsed JSON response:", jsonData);
    }
    return jsonData;
  } catch (err) {
    // If response is empty or not JSON, return empty array for list endpoints
    if (endpoint.includes("/projects/mine") || endpoint.includes("/projects")) {
      return [] as T;
    }
    throw new Error("Invalid response from server");
  }
}

// API Methods

// Health & Status
export const checkHealth = () =>
  apiRequest<{ ok: boolean; service: string }>("/health");

export const checkReady = () =>
  apiRequest<{ ok: boolean; db: string }>("/ready");

// Landing stats (public)
export type LandingStats = {
  active_projects: number;
  contributors: number;
  grants_distributed_usd: number;
};

export const getLandingStats = () => apiRequest<LandingStats>("/stats/landing");

// Authentication
export const getCurrentUser = () =>
  apiRequest<{
    id: string;
    role: string;
    first_name?: string;
    last_name?: string;
    location?: string;
    website?: string;
    bio?: string;
    avatar_url?: string;
    telegram?: string;
    linkedin?: string;
    whatsapp?: string;
    twitter?: string;
    discord?: string;
    github?: {
      login: string;
      avatar_url: string;
      name?: string;
      email?: string;
      location?: string;
      bio?: string;
      website?: string;
    };
  }>("/me", { requiresAuth: true });

export const resyncGitHubProfile = () =>
  apiRequest<{
    github: {
      login: string;
      avatar_url: string;
      name?: string;
      email?: string;
      location?: string;
      bio?: string;
      website?: string;
    };
  }>("/me/github/resync", { requiresAuth: true, method: "POST" });

// Referral code storage: captured from a "?ref=" URL param at app root
// (see App.tsx) and persisted here so it survives navigation to whatever
// page the user actually clicks "Sign in" from, and the GitHub round trip.
//
// Two rules govern it, and both exist because a referral now pays real
// shares from the Founding Contributor Pool:
//
//  1. **It expires after 30 days**, measured from when it was CAPTURED, not
//     when it is used. Someone who clicked a link eight months ago and signs
//     up today from an unrelated source has not been referred in any
//     meaningful sense, and an unbounded window is undisputable-by-design in
//     the wrong direction.
//  2. **It is cleared the moment a signup succeeds.** Left in place, a second
//     account created in the same browser would credit the same referrer
//     again - which is a farming path, not an edge case.
const REFERRAL_CODE_STORAGE_KEY = "grainlify_ref_code";

/** The window is NOT a constant here. It is whatever the backend says when
 *  it issues the capture, because the backend is what enforces it - a second
 *  copy of the number in this file is a copy that can silently disagree with
 *  the rule. Everything user-visible reads the server's figure. */
interface StoredReferralCode {
  /** Server-signed. The client cannot backdate or extend it. */
  token: string;
  /** Local capture time. Only used to drop obviously-stale entries early -
   *  the authoritative expiry is the token's own, checked server-side. */
  capturedAt: number;
  /** The window the server issued this token under, in days. Stored with the
   *  token so the local sweep uses the same figure the token was signed for,
   *  even if the server's window changes afterwards. */
  validDays: number;
}

export const captureReferralCodeFromURL = async (): Promise<void> => {
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref) return;
  try {
    // The server signs {code, capturedAt} and we store the signed token, so
    // the window is enforced where it cannot be edited. Storing the bare code
    // with a local timestamp left the 30 days bypassable by calling the
    // login endpoint directly with a stale code.
    //
    // Deliberately a bare fetch rather than apiRequest: this is a public
    // endpoint that runs on every page load, and apiRequest treats ANY 401 as
    // "your session died" and clears the stored JWT. A signed-in user opening
    // a referral link must never be logged out by a hiccup on a call that has
    // nothing to do with their session.
    const res = await fetch(
      `${API_BASE_URL}/referrals/capture?ref=${encodeURIComponent(ref)}`,
    );
    if (!res.ok) return;
    const body = (await res.json()) as { token?: unknown; valid_days?: unknown };
    if (typeof body.token !== "string" || typeof body.valid_days !== "number") return;

    const entry: StoredReferralCode = {
      token: body.token,
      capturedAt: Date.now(),
      validDays: body.valid_days,
    };
    localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // A failed capture means no attribution rather than an unverifiable one.
    // Silent because this runs on every page load and the visitor has no
    // action to take: no toast, no thrown error, no cleared session. The link
    // still works, it just does not carry credit.
  }
};

/** Reads the stored code if it is still within the window, clearing it
 *  otherwise so an expired code cannot linger and be honoured later.
 *
 *  Values written before this format existed were bare strings with no
 *  capture time. Their age is unknowable, so they are dropped rather than
 *  assumed recent - honouring an unbounded-age code is the exact thing the
 *  window exists to stop. */
export const readStoredReferralCode = (): string | null => {
  const raw = localStorage.getItem(REFERRAL_CODE_STORAGE_KEY);
  if (!raw) return null;

  let entry: StoredReferralCode;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.token !== "string" ||
      typeof parsed?.capturedAt !== "number" ||
      typeof parsed?.validDays !== "number"
    ) {
      throw new Error("unrecognised shape");
    }
    entry = parsed;
  } catch {
    clearStoredReferralCode();
    return null;
  }

  if (Date.now() - entry.capturedAt > entry.validDays * 24 * 60 * 60 * 1000) {
    clearStoredReferralCode();
    return null;
  }
  return entry.token;
};

/** Called once a signup completes. See rule 2 above. */
export const clearStoredReferralCode = (): void => {
  localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
};

export const getGitHubLoginUrl = () => {
  // Pass the current frontend origin as redirect parameter
  // This allows the backend to redirect back to the correct frontend after OAuth
  const redirectAfterLogin = window.location.origin;
  const params = new URLSearchParams({ redirect: redirectAfterLogin });
  // Sent as ref_token: the login endpoint no longer honours a bare code.
  const refToken = readStoredReferralCode();
  if (refToken) params.set("ref_token", refToken);
  return `${API_BASE_URL}/auth/github/login/start?${params.toString()}`;
};

export const getGitHubStatus = () =>
  apiRequest<{
    linked: boolean;
    github?: { id: number; login: string };
  }>("/auth/github/status", { requiresAuth: true });

// User Profile
export const getUserProfile = () =>
  apiRequest<{
    contributions_count: number;
    projects_contributed_to_count: number;
    projects_led_count: number;
    rewards_count: number;
    languages: Array<{ language: string; contribution_count: number }>;
    ecosystems: Array<{ ecosystem_name: string; contribution_count: number }>;
    kyc_verified?: boolean;
    rank: {
      position: number | null;
      tier: string;
      tier_name: string;
      tier_color: string;
    };
  }>("/profile", { requiresAuth: true });

export const getProfileCalendar = (userId?: string, login?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  if (login) params.append("login", login);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{
    calendar: Array<{ date: string; count: number; level: number }>;
    total: number;
  }>(`/profile/calendar${query}`, { requiresAuth: true });
};

export const getProfileActivity = (
  limit = 50,
  offset = 0,
  userId?: string,
  login?: string,
) => {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  if (userId) params.append("user_id", userId);
  if (login) params.append("login", login);
  return apiRequest<{
    activities: Array<{
      type: "pull_request" | "issue";
      id: string;
      number: number;
      title: string;
      url: string;
      state?: string;
      date: string;
      month_year: string;
      project_name: string;
      project_id: string;
      merged?: boolean;
      draft?: boolean;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>(`/profile/activity?${params.toString()}`, { requiresAuth: true });
};

export const getProjectsContributed = (userId?: string, login?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  if (login) params.append("login", login);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<
    Array<{
      id: string;
      github_full_name: string;
      status: string;
      ecosystem_name?: string;
      language?: string;
      owner_avatar_url?: string;
    }>
  >(`/profile/projects${query}`, { requiresAuth: true });
};

export const getProjectsLed = (userId?: string, login?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  if (login) params.append("login", login);
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<
    Array<{
      id: string;
      github_full_name: string;
      status: string;
      ecosystem_name?: string;
      language?: string;
      owner_avatar_url?: string;
    }>
  >(`/profile/projects-led${query}`, { requiresAuth: true });
};

export const getPublicProfile = (userId?: string, login?: string) => {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  if (login) params.append("login", login);
  return apiRequest<{
    login: string;
    user_id: string;
    avatar_url?: string;
    contributions_count: number;
    projects_contributed_to_count: number;
    projects_led_count: number;
    languages: Array<{ language: string; contribution_count: number }>;
    ecosystems: Array<{ ecosystem_name: string; contribution_count: number }>;
    bio?: string;
    website?: string;
    telegram?: string;
    linkedin?: string;
    whatsapp?: string;
    twitter?: string;
    discord?: string;
    kyc_verified?: boolean;
    rank: {
      position: number | null;
      tier: string;
      tier_name: string;
      tier_color: string;
    };
  }>(`/profile/public?${params.toString()}`, { requiresAuth: false });
};

export const updateProfile = (data: {
  first_name?: string;
  last_name?: string;
  location?: string;
  website?: string;
  bio?: string;
  telegram?: string;
  linkedin?: string;
  whatsapp?: string;
  twitter?: string;
  discord?: string;
}) =>
  apiRequest<{ message: string }>("/profile/update", {
    method: "PUT",
    body: JSON.stringify(data),
    requiresAuth: true,
  });

export const updateAvatar = (avatarUrl: string) =>
  apiRequest<{ message: string; avatar_url: string }>("/profile/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatar_url: avatarUrl }),
    requiresAuth: true,
  });

// Projects
export const getPublicProjects = (params?: {
  ecosystem?: string;
  language?: string;
  category?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.ecosystem) queryParams.append("ecosystem", params.ecosystem);
  if (params?.language) queryParams.append("language", params.language);
  if (params?.category) queryParams.append("category", params.category);
  if (params?.tags) queryParams.append("tags", params.tags);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/projects?${queryString}` : "/projects";

  return apiRequest<{
    projects: Array<{
      id: string;
      github_full_name: string;
      language: string | null;
      tags: string[];
      category: string | null;
      stars_count: number;
      forks_count: number;
      contributors_count: number;
      open_issues_count: number;
      open_prs_count: number;
      ecosystem_name: string | null;
      ecosystem_slug: string | null;
      description?: string;
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>(endpoint);
};

// Global search across verified projects, their open issues, and known
// contributors - backs the Cmd+K search page. Same visibility rule as
// Browse: a project must be verified, have completed setup, and not be
// deleted before it (or its issues) can appear here.
export const searchAll = (query: string) =>
  apiRequest<{
    projects: Array<{
      id: string;
      github_full_name: string;
      description: string | null;
      ecosystem_name: string | null;
    }>;
    issues: Array<{
      id: string;
      title: string;
      number: number;
      project_id: string;
      project_full_name: string;
    }>;
    contributors: Array<{
      login: string;
      user_id: string;
      avatar_url: string;
      contributions: number;
    }>;
  }>(`/search?q=${encodeURIComponent(query)}`);

// Get recommended projects (top by contributors count)
export const getRecommendedProjects = (limit: number = 8) =>
  apiRequest<{
    projects: Array<{
      id: string;
      github_full_name: string;
      language: string | null;
      tags: string[];
      category: string | null;
      stars_count: number;
      forks_count: number;
      contributors_count: number;
      open_issues_count: number;
      open_prs_count: number;
      ecosystem_name: string | null;
      ecosystem_slug: string | null;
      description?: string;
      created_at: string;
      updated_at: string;
    }>;
  }>(`/projects/recommended?limit=${limit}`);

export const getPublicProject = (projectId: string) =>
  apiRequest<{
    id: string;
    github_full_name: string;
    language: string | null;
    tags: string[];
    category: string | null;
    stars_count: number;
    forks_count: number;
    contributors_count: number;
    open_issues_count: number;
    open_prs_count: number;
    ecosystem_name: string | null;
    ecosystem_slug: string | null;
    created_at: string;
    updated_at: string;
    languages: Array<{ name: string; percentage: number }>;
    readme?: string;
    repo?: {
      full_name: string;
      html_url: string;
      homepage: string;
      description: string;
      open_issues_count: number;
      owner_login: string;
      owner_avatar_url: string;
    };
  }>(`/projects/${projectId}`);

export const getPublicProjectIssues = (projectId: string) =>
  apiRequest<{
    issues: Array<{
      github_issue_id: number;
      number: number;
      state: string;
      title: string;
      description: string | null;
      author_login: string;
      labels: any[];
      url: string;
      updated_at: string | null;
      last_seen_at: string;
    }>;
  }>(`/projects/${projectId}/issues/public`);

export const getPublicProjectPRs = (projectId: string) =>
  apiRequest<{
    prs: Array<{
      github_pr_id: number;
      number: number;
      state: string;
      title: string;
      author_login: string;
      url: string;
      merged: boolean;
      created_at: string | null;
      updated_at: string | null;
      closed_at: string | null;
      merged_at: string | null;
      last_seen_at: string;
    }>;
  }>(`/projects/${projectId}/prs/public`);

export const getProjectFilters = () =>
  apiRequest<{
    languages: string[];
    categories: string[];
    tags: string[];
  }>("/projects/filters");

// Ecosystems
export const getEcosystems = () =>
  apiRequest<{
    ecosystems: Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      website_url: string | null;
      status: string;
      project_count: number;
      user_count: number;
      created_at: string;
      updated_at: string;
    }>;
  }>("/ecosystems");

export type EcosystemDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  about?: string | null;
  links?: Array<{ label: string; url: string }> | null;
  key_areas?: Array<{ title: string; description: string }> | null;
  technologies?: string[] | null;
  project_count: number;
  contributors_count: number;
  open_issues_count: number;
  open_prs_count: number;
};

export const getEcosystemDetail = (id: string) =>
  apiRequest<EcosystemDetail>(`/ecosystems/${id}`);

// Open Source Week
export const getOpenSourceWeekEvents = () =>
  apiRequest<{
    events: Array<{
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      status: string;
      start_at: string;
      end_at: string;
      created_at: string;
      updated_at: string;
    }>;
  }>("/open-source-week/events");

export const getOpenSourceWeekEvent = (id: string) =>
  apiRequest<{
    event: {
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      status: string;
      start_at: string;
      end_at: string;
      created_at: string;
      updated_at: string;
    };
  }>(`/open-source-week/events/${id}`);

export const getAdminOpenSourceWeekEvents = () =>
  apiRequest<{
    events: Array<{
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      status: string;
      start_at: string;
      end_at: string;
      created_at: string;
      updated_at: string;
    }>;
  }>("/admin/open-source-week/events", { requiresAuth: true, method: "GET" });

export const createOpenSourceWeekEvent = (data: {
  title: string;
  description?: string;
  location?: string;
  status: "upcoming" | "running" | "completed" | "draft";
  start_at: string; // RFC3339
  end_at: string; // RFC3339
}) =>
  apiRequest<{ id: string }>("/admin/open-source-week/events", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteOpenSourceWeekEvent = (id: string) =>
  apiRequest<{ ok: boolean }>(`/admin/open-source-week/events/${id}`, {
    requiresAuth: true,
    method: "DELETE",
  });

export const createEcosystem = (data: {
  name: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  status: "active" | "inactive";
  about?: string;
  links?: Array<{ label: string; url: string }>;
  key_areas?: Array<{ title: string; description: string }>;
  technologies?: string[];
}) =>
  apiRequest<{
    id: string;
    slug: string;
    name: string;
    description: string;
    website_url: string;
    status: string;
    project_count: number;
    user_count: number;
    created_at: string;
    updated_at: string;
  }>("/admin/ecosystems", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

export const getAdminEcosystems = () =>
  apiRequest<{
    ecosystems: Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      website_url: string | null;
      status: string;
      project_count: number;
      user_count: number;
      created_at: string;
      updated_at: string;
      about: string | null;
      links: Array<{ label: string; url: string }> | null;
      key_areas: Array<{ title: string; description: string }> | null;
      technologies: string[] | null;
    }>;
  }>("/admin/ecosystems", {
    requiresAuth: true,
    method: "GET",
  });

export const getAdminEcosystem = (id: string) =>
  apiRequest<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    website_url: string | null;
    status: string;
    project_count: number;
    user_count: number;
    created_at: string;
    updated_at: string;
    about: string | null;
    links: Array<{ label: string; url: string }> | null;
    key_areas: Array<{ title: string; description: string }> | null;
    technologies: string[] | null;
  }>(`/admin/ecosystems/${id}`, {
    requiresAuth: true,
    method: "GET",
  });

export const deleteEcosystem = (id: string) =>
  apiRequest<{
    ok: boolean;
  }>(`/admin/ecosystems/${id}`, {
    requiresAuth: true,
    method: "DELETE",
  });

export const updateEcosystem = (id: string, data: {
  name: string;
  description?: string;
  website_url?: string;
  logo_url?: string;
  status: 'active' | 'inactive';
  about?: string;
  links?: Array<{ label: string; url: string }>;
  key_areas?: Array<{ title: string; description: string }>;
  technologies?: string[];
}) =>
  apiRequest<{
    id: string;
    slug: string;
    name: string;
    description: string;
    website_url: string;
    status: string;
    project_count: number;
    user_count: number;
    created_at: string;
    updated_at: string;
  }>(`/admin/ecosystems/${id}`, {
    requiresAuth: true,
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Leaderboard
/**
 * Contributors ranked by merged pull requests in verified projects.
 *
 * `window` defaults to the rolling 90-day season board; pass "all" for the
 * cumulative view. `ecosystem` is an ecosystems.slug and now actually
 * filters - it was previously sent on every request and ignored by the
 * handler, so the dropdown appeared to work and did nothing.
 */
export const getLeaderboard = (
  limit = 10,
  offset = 0,
  ecosystem?: string,
  window: "season" | "all" = "season",
) =>
  apiRequest<
    Array<{
      rank: number;
      rank_tier: string;
      rank_tier_name: string;
      username: string;
      avatar: string;
      user_id: string;
      merged_prs: number;
      ecosystems: string[];
      score: number;
    }>
  >(
    `/leaderboard?limit=${limit}&offset=${offset}&window=${window}` +
    (ecosystem ? `&ecosystem=${encodeURIComponent(ecosystem)}` : ""),
  );

/**
 * Organisations ranked by distinct contributors who landed a merged PR.
 *
 * Replaces deriving the projects board in the browser from
 * /projects/recommended, which sampled only the top 50 repos and summed
 * per-repo contributor counts (double-counting anyone active in two repos of
 * the same org).
 */
export const getProjectLeaderboard = (
  limit = 25,
  offset = 0,
  ecosystem?: string,
  window: "season" | "all" = "season",
) =>
  apiRequest<{
    projects: Array<{
      rank: number;
      name: string;
      logo: string;
      contributors: number;
      merged_prs: number;
      open_issues: number;
      activity: string;
      ecosystems: string[];
      score: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }>(
    `/leaderboard/projects?limit=${limit}&offset=${offset}&window=${window}` +
    (ecosystem ? `&ecosystem=${encodeURIComponent(ecosystem)}` : ""),
  );

// Admin Bootstrap
export const bootstrapAdmin = (bootstrapToken: string) =>
  apiRequest<{
    ok: boolean;
    token: string;
    role: string;
  }>("/admin/bootstrap", {
    requiresAuth: true,
    method: "POST",
    headers: {
      "X-Admin-Bootstrap-Token": bootstrapToken,
    },
  });

// KYC
export const startKYCVerification = () =>
  apiRequest<{
    session_id: string;
    url: string;
  }>("/auth/kyc/start", {
    requiresAuth: true,
    method: "POST",
  });

export const getKYCStatus = () =>
  apiRequest<{
    status: string | null;
    session_id?: string;
    verified_at?: string;
    rejection_reason?: string;
    data?: any;
    extracted?: any;
  }>("/auth/kyc/status", { requiresAuth: true });

// Referral program
export interface ReferralStats {
  code: string;
  total_referred: number;
  pending: number;
  completed: number;
  points_earned: number;
  points_per_referral: number;
  /** The attribution window, in days, straight from the constant the backend
   *  enforces. Rendered in the copy so the published rule and the enforced
   *  rule are the same number by construction. */
  referral_window_days: number;
}

export const getReferralStats = () =>
  apiRequest<ReferralStats>("/referrals/me", { requiresAuth: true });

// Points balance (shared across referrals + social-follow + any future source)
export interface PointsBalance {
  balance: number;
  usdc_per_point: number;
  min_redemption_points: number;
}

export const getPointsBalance = () =>
  apiRequest<PointsBalance>("/points/me", { requiresAuth: true });

// Social-follow program
export const SOCIAL_FOLLOW_PLATFORMS = ["linkedin", "x"] as const;
export type SocialFollowPlatform = (typeof SOCIAL_FOLLOW_PLATFORMS)[number];

/** One submission covering both platforms. There is deliberately no
 *  per-platform status: a half-approved state is what the atomic model
 *  removes, so representing one here would put it straight back. */
export interface SocialFollowStatus {
  platforms: string[];
  submitted: boolean;
  status: "pending" | "approved" | "rejected" | "revoked" | null;
  /** Why it was rejected or revoked. Shown to the contributor - a withdrawal
   *  with no stated reason reads as arbitrary. */
  decision_reason?: string | null;
  decided_at?: string | null;
  /** The single question the whole feature answers. */
  eligible: boolean;
}

export const getSocialFollowStatus = () =>
  apiRequest<SocialFollowStatus>("/social-follow/me", { requiresAuth: true });

/** Both screenshots go in one request. The API refuses a partial submission,
 *  so there is no path here that submits one platform on its own. */
export const submitSocialFollowProof = (screenshots: { linkedin: string; x: string }) =>
  apiRequest<{ id: string; status: string }>("/social-follow/submit", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({
      linkedin_screenshot: screenshots.linkedin,
      x_screenshot: screenshots.x,
    }),
  });

/** The categories the support widget offers. Mirrors the CHECK constraint on
 *  support_requests.category and the topic map in the backend's Telegram sink -
 *  a value not in this union is rejected at the edge with `invalid_category`. */
export type SupportCategory = "bug" | "kyc" | "idea" | "help" | "other";

// Public (no auth required) so it works for anonymous landing-page visitors,
// not just signed-in dashboard users - somebody who can't sign in is exactly
// the person most likely to need support.
//
// reporter_login is deliberately absent. It used to be sent from here and the
// backend relayed it as the reporter's identity, so anyone could file a report
// as anyone - a value that looked verified and was not. Identity is now
// resolved server-side from the JWT; an unauthenticated report simply carries
// none, which is correct rather than a regression.
//
// The category decides where this lands. It is not cosmetic: `kyc` routes to a
// private DM instead of a readable group, so sending the wrong one publishes
// something that was meant to stay private. Send what the person picked and
// nothing inferred.
export const submitSupportRequest = (payload: {
  category: SupportCategory;
  message: string;
  screenshot?: string;
  page_url?: string;
}) =>
  apiRequest<{ ok: boolean; support_id: string; delivered: string[] }>("/support-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export interface SocialFollowSubmission {
  id: string;
  user_id: string;
  github_login?: string;
  /** Both screenshots, so a reviewer sees them side by side and makes one
   *  decision rather than judging one platform without the other in view. */
  linkedin_screenshot: string;
  x_screenshot: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  decision_reason?: string | null;
  /** Machine-readable rejection reason, stored ALONGSIDE the free-text note
   *  rather than replacing it - decisions made before codes existed still
   *  carry only a note, and those are the only record of why those people
   *  were turned down. */
  reason_code?: string | null;
  /** The code's label, resolved server-side. The frontend never maps codes to
   *  words itself: that would be a second copy of a rule the backend already
   *  owns, and the admin queue, the contributor's page and the notification
   *  would be free to disagree about what a code means. */
  reason_label?: string;
  decided_at?: string | null;
  /** Who decided. Recorded on the row and in social_follow_decisions since the
   *  feature shipped, but not readable from the list until now - so the review
   *  page could show a decision with no author. Approval grants founding-pool
   *  eligibility, so the decision needs a name against it. */
  decided_by?: string | null;
  decided_by_login?: string;
  created_at: string;
}

/** One page of the review queue.
 *
 *  `total` and `has_more` describe the whole filtered queue, not the page.
 *  Both matter: an action offered over "everything on screen" has to be able
 *  to say how much is NOT on screen, or the offer is misleading. */
export interface SocialFollowSubmissionPage {
  submissions: SocialFollowSubmission[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/** Paged deliberately. Every row carries both screenshots as base64 data URLs
 *  - around 787kB each - so the unpaginated version of this returned 17MB for
 *  22 pending rows and grew with the queue. The server clamps `limit`, so a
 *  caller cannot ask for the whole queue back. */
export const getAdminSocialFollowSubmissions = (
  status: string = "pending",
  { limit, offset }: { limit?: number; offset?: number } = {}
) => {
  const params = new URLSearchParams({ status });
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  return apiRequest<SocialFollowSubmissionPage>(
    `/admin/social-follow/submissions?${params.toString()}`,
    { requiresAuth: true }
  );
};

/** A rejection reason offered in the picker. Fetched rather than hardcoded, so
 *  the codes and their wording live in exactly one place. */
export interface SocialFollowReasonCode {
  code: string;
  label: string;
  /** Only "other" sets this. It names no problem on its own, so without a note
   *  the contributor is told their proof failed for "Other" - which reads as
   *  an answer while saying nothing. */
  needs_note: boolean;
}

export const getSocialFollowReasonCodes = () =>
  apiRequest<{ reason_codes: SocialFollowReasonCode[] }>(
    "/admin/social-follow/reason-codes",
    { requiresAuth: true }
  );

/** Per-row outcome of a bulk approval.
 *
 *  Three lists, not two. `skipped` is the queue having moved under the
 *  reviewer - already decided, or gone - and needs no action. `failed` is
 *  something actually going wrong. Collapsing them would send somebody hunting
 *  a bug that isn't there, and reporting only a total would be the "done" that
 *  wasn't. */
export interface SocialFollowBulkResult {
  approved: { id: string }[];
  skipped: { id: string; reason: "not_pending" | "not_found"; current_status?: string }[];
  failed: { id: string }[];
  approved_count: number;
  skipped_count: number;
  failed_count: number;
}

export const bulkApproveSocialFollowSubmissions = (ids: string[]) =>
  apiRequest<SocialFollowBulkResult>(
    "/admin/social-follow/submissions/bulk-approve",
    { requiresAuth: true, method: "POST", body: JSON.stringify({ ids }) }
  );

export const approveSocialFollowSubmission = (id: string) =>
  apiRequest<{ ok: boolean }>(`/admin/social-follow/submissions/${id}/approve`, {
    requiresAuth: true,
    method: "POST",
  });

/** A reason is required by the API and shown to the contributor. */
/** `reason_code` is the category; `reason` is the free-text note stored
 *  alongside it. The note is required only for "other". */
export const rejectSocialFollowSubmission = (
  id: string,
  { reasonCode, note }: { reasonCode: string; note?: string }
) =>
  apiRequest<{ ok: boolean }>(`/admin/social-follow/submissions/${id}/reject`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason_code: reasonCode, reason: note ?? "" }),
  });

/** Withdraws an approval that has already been granted. Eligibility is
 *  re-read at settlement, so this has to be possible after the fact. The
 *  submission and its screenshots are kept - only the status changes. */
export const revokeSocialFollowSubmission = (id: string, reason: string) =>
  apiRequest<{ ok: boolean }>(`/admin/social-follow/submissions/${id}/revoke`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export interface Redemption {
  id: string;
  points_spent: number;
  usdc_amount: string;
  stellar_wallet_address: string;
  status: "pending" | "paid" | "rejected";
  created_at: string;
}

export const createRedemption = (points: number, stellarWalletAddress: string) =>
  apiRequest<{ id: string; usdc_amount: number }>("/redemptions", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ points, stellar_wallet_address: stellarWalletAddress }),
  });

export const getMyRedemptions = () =>
  apiRequest<{ redemptions: Redemption[] }>("/redemptions/me", { requiresAuth: true });

// The caller's own issue applications, bucketed server-side into
// applied/assigned/pending_review/complete - pending_review/complete are
// derived at read time from a PR<->issue match, not stored, so they're only
// ever present alongside a pr_* field when that match exists.
export interface IssueApplicationSummary {
  id: string;
  status: "applied" | "assigned" | "pending_review" | "complete";
  project_id: string;
  project_name: string;
  issue_number: number;
  issue_title: string;
  issue_url: string;
  labels: string[];
  applied_at?: string;
  assigned_at?: string;
  pr_number?: number;
  pr_url?: string;
  pr_title?: string;
  pr_created_at?: string;
  pr_merged_at?: string;
}

export const getMyIssueApplications = () =>
  apiRequest<{ issue_applications: IssueApplicationSummary[] }>("/issue-applications/me", { requiresAuth: true });

export interface AdminRedemption extends Redemption {
  user_id: string;
  login?: string;
}

export const getAdminRedemptions = (status: string = "pending") =>
  apiRequest<{ redemptions: AdminRedemption[] }>(
    `/admin/redemptions?status=${encodeURIComponent(status)}`,
    { requiresAuth: true }
  );

export const markRedemptionPaid = (id: string) =>
  apiRequest<{ ok: boolean }>(`/admin/redemptions/${id}/mark-paid`, {
    requiresAuth: true,
    method: "POST",
  });

export const rejectRedemption = (id: string, reason?: string) =>
  apiRequest<{ ok: boolean }>(`/admin/redemptions/${id}/reject`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason: reason ?? "" }),
  });

// Notifications
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link_path?: string;
  read_at: string | null;
  created_at: string;
}

export const getNotifications = (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
  const q = new URLSearchParams();
  if (params?.limit) q.append("limit", params.limit.toString());
  if (params?.offset) q.append("offset", params.offset.toString());
  if (params?.unreadOnly) q.append("unread_only", "true");
  const qs = q.toString();
  return apiRequest<{ notifications: AppNotification[] }>(
    `/notifications/${qs ? `?${qs}` : ""}`,
    { requiresAuth: true }
  );
};

export const getNotificationCount = () =>
  apiRequest<{ count: number }>("/notifications/unread-count", { requiresAuth: true });

export const markNotificationRead = (id: string) =>
  apiRequest<{ ok: boolean }>(`/notifications/${id}/read`, {
    requiresAuth: true,
    method: "POST",
  });

export const markAllNotificationsRead = () =>
  apiRequest<{ ok: boolean }>("/notifications/read-all", {
    requiresAuth: true,
    method: "POST",
  });

export interface NotificationPreference {
  type: string;
  in_app: boolean;
  email: boolean;
}

export const getNotificationPreferences = () =>
  apiRequest<{ preferences: NotificationPreference[] }>("/notifications/preferences", {
    requiresAuth: true,
  });

export const updateNotificationPreferences = (preferences: NotificationPreference[]) =>
  apiRequest<{ ok: boolean }>("/notifications/preferences", {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });

// My Projects (for maintainers)
export const getMyProjects = () =>
  apiRequest<
    Array<{
      id: string;
      github_full_name: string;
      github_repo_id: number;
      status: string;
      ecosystem_name: string;
      language: string;
      tags: string[];
      category: string;
      description?: string | null;
      verification_error: string | null;
      verified_at: string | null;
      webhook_created_at: string | null;
      webhook_id: number | null;
      webhook_url: string | null;
      owner_avatar_url?: string;
      created_at: string;
      updated_at: string;
      needs_metadata?: boolean;
    }>
  >("/projects/mine", { requiresAuth: true });

export const createProject = (data: {
  github_full_name: string;
  ecosystem_name: string;
  language?: string;
  tags?: string[];
  category?: string;
}) =>
  apiRequest<{
    id: string;
    github_full_name: string;
    status: string;
    ecosystem_name: string;
    language: string;
    tags: string[];
    category: string;
    created_at: string;
    updated_at: string;
  }>("/projects", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

export type PendingSetupProject = {
  id: string;
  github_full_name: string;
  description: string | null;
  ecosystem_id: string;
  ecosystem_name: string;
  language: string | null;
  tags: string[];
  category: string | null;
};

export const getPendingSetupProjects = () =>
  apiRequest<PendingSetupProject[]>("/projects/pending-setup", {
    requiresAuth: true,
  });

export const updateProjectMetadata = (
  projectId: string,
  data: {
    description?: string;
    ecosystem_name?: string;
    language?: string;
    tags?: string[];
    category?: string;
  },
) =>
  apiRequest<{ ok: boolean }>(`/projects/${projectId}/metadata`, {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify(data),
  });

export const verifyProject = (projectId: string) =>
  apiRequest<{
    id: string;
    status: string;
    verified_at: string;
    webhook_id: number;
    webhook_url: string;
  }>(`/projects/${projectId}/verify`, {
    requiresAuth: true,
    method: "POST",
  });

export const syncProject = (projectId: string) =>
  apiRequest<{
    ok: boolean;
    message: string;
  }>(`/projects/${projectId}/sync`, {
    requiresAuth: true,
    method: "POST",
  });

// Project Data (Issues and PRs)
export const getProjectIssues = (projectId: string) =>
  apiRequest<{
    issues: Array<{
      github_issue_id: number;
      number: number;
      state: string;
      title: string;
      description: string | null;
      author_login: string;
      assignees: any[];
      labels: any[];
      comments_count: number;
      comments: any[];
      url: string;
      updated_at: string | null;
      last_seen_at: string;
    }>;
  }>(`/projects/${projectId}/issues`, { requiresAuth: true });

export const getProjectPRs = (projectId: string) =>
  apiRequest<{
    prs: Array<{
      github_pr_id: number;
      number: number;
      state: string;
      title: string;
      author_login: string;
      url: string;
      merged: boolean;
      created_at: string | null;
      updated_at: string | null;
      closed_at: string | null;
      merged_at: string | null;
      last_seen_at: string;
    }>;
  }>(`/projects/${projectId}/prs`, { requiresAuth: true });

export const applyToIssue = (
  projectId: string,
  issueNumber: number,
  message: string,
) =>
  apiRequest<{
    ok: boolean;
    comment: {
      id: number;
      body: string;
      user: { login: string };
      created_at: string;
      updated_at: string;
    };
  }>(`/projects/${projectId}/issues/${issueNumber}/apply`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ message }),
  });

export const postBotComment = (
  projectId: string,
  issueNumber: number,
  body: string,
) =>
  apiRequest<{
    ok: boolean;
    comment: {
      id: number;
      body: string;
      user: { login: string };
      created_at: string;
      updated_at: string;
    };
  }>(`/projects/${projectId}/issues/${issueNumber}/bot-comment`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ body }),
  });

export const withdrawApplication = (
  projectId: string,
  issueNumber: number,
  commentId: number,
) =>
  apiRequest<{ ok: boolean }>(
    `/projects/${projectId}/issues/${issueNumber}/withdraw`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify({ comment_id: commentId }),
    },
  );

export const assignApplicant = (
  projectId: string,
  issueNumber: number,
  assignee: string,
) =>
  apiRequest<{ ok: boolean }>(
    `/projects/${projectId}/issues/${issueNumber}/assign`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify({ assignee }),
    },
  );

export const unassignApplicant = (projectId: string, issueNumber: number) =>
  apiRequest<{ ok: boolean }>(
    `/projects/${projectId}/issues/${issueNumber}/unassign`,
    {
      requiresAuth: true,
      method: "POST",
    },
  );

export const rejectApplication = (
  projectId: string,
  issueNumber: number,
  assignee: string,
) =>
  apiRequest<{ ok: boolean }>(
    `/projects/${projectId}/issues/${issueNumber}/reject`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify({ assignee }),
    },
  );

// Organizations
export interface OrgSummary {
  login: string;
  avatar_url: string;
  repo_count: number;
  stars_count: number;
  contributors_count: number;
  merged_prs_count: number;
  rank_position: number | null;
  rank_tier: string;
  rank_tier_name: string;
  rank_tier_color: string;
  average_rating: number | null;
  ratings_count: number;
}

export interface OrgRating {
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  github_login?: string;
}

export interface OrgRatingStatus {
  eligible: boolean;
  rating: {
    rating: number;
    comment?: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface OrgActivityWeek {
  week_start: string;
  issues_opened: number;
  prs_merged: number;
}

export const getOrgSummary = (login: string) =>
  apiRequest<OrgSummary>(`/orgs/${login}`);

export const getOrgActivity = (login: string) =>
  apiRequest<{ weeks: OrgActivityWeek[] }>(`/orgs/${login}/activity`);

export interface OrgCalendarDay {
  date: string;
  count: number;
  level: number;
}

export const getOrgCalendar = (login: string) =>
  apiRequest<{ calendar: OrgCalendarDay[]; total: number }>(`/orgs/${login}/calendar`);

export interface OrgLinks {
  telegram: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  twitter: string | null;
  discord: string | null;
}

export const getOrgLinks = (login: string) =>
  apiRequest<OrgLinks>(`/orgs/${login}/links`);

// Omitting a key leaves that link untouched; passing "" clears it (sets it
// to NULL server-side) - unlike updateProfile, which has no way to clear a
// field once set. Matches the codebase's org_links backend behavior
// exactly, see internal/handlers/org_links.go's Update().
export const updateOrgLinks = (login: string, links: Partial<OrgLinks>) =>
  apiRequest<{ ok: boolean }>(`/orgs/${login}/links`, {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify(links),
  });

export const getOrgRatings = (
  login: string,
  params?: { limit?: number; offset?: number },
) => {
  const q = new URLSearchParams();
  if (params?.limit) q.append("limit", params.limit.toString());
  if (params?.offset) q.append("offset", params.offset.toString());
  const qs = q.toString();
  return apiRequest<{ ratings: OrgRating[]; total: number }>(
    `/orgs/${login}/ratings${qs ? `?${qs}` : ""}`,
  );
};

export const getMyOrgRatingStatus = (login: string) =>
  apiRequest<OrgRatingStatus>(`/orgs/${login}/ratings/me`, {
    requiresAuth: true,
  });

export const submitOrgRating = (
  login: string,
  data: { rating: number; comment?: string },
) =>
  apiRequest<{ ok: boolean }>(`/orgs/${login}/ratings`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

// ---------------------------------------------------------------------------
// GrainHack (AI-specs.md) - Slice 1: hackathon lifecycle, project
// applications, GitHub-label issue intake.
// ---------------------------------------------------------------------------

export interface Hackathon {
  id: string;
  name: string;
  phase: "draft" | "application_period" | "issue_prep" | "live";
  announced_at: string | null;
  application_period_start: string | null;
  application_period_end: string | null;
  issue_prep_start: string | null;
  starts_at: string | null;
  ends_at: string | null;
  merge_grace_period_hours: number;
  /** What the sponsor put in. The three figures are always published
   *  together: showing only the net pool would hide the deduction, and
   *  disclosure is the whole justification for taking a fee. */
  sponsor_total_usdc: string | null;
  platform_fee_usdc: string | null;
  platform_fee_rate_pct: string | null;
  /** Net - what actually pays people, and what every payout path divides. */
  contributor_prize_pool: string | null;
  maintainer_prize_pool: string | null;
  net_pool_usdc: string | null;
  created_at: string;
}

export interface HackathonBlockingReason {
  field: string;
  message: string;
}

export interface HackathonApplication {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  project_id: string;
  project_full_name: string;
  short_description: string;
  goal: string;
  expected_issue_count: number;
  maintainer_contact: string;
  status: "pending" | "accepted" | "rejected" | "more_info_requested";
  review_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface HackathonApplicationSignal {
  computed: boolean;
  value?: unknown;
  note?: string;
}

export interface HackathonApplicationSignals {
  repo_created_at: HackathonApplicationSignal;
  had_commits_before_announced: HackathonApplicationSignal;
  commit_activity_90d: HackathonApplicationSignal;
  distinct_contributors: HackathonApplicationSignal;
  prior_grainhack_participation: HackathonApplicationSignal;
  median_time_to_first_review_hours: HackathonApplicationSignal;
  prior_flagged_associations: HackathonApplicationSignal;
}

export interface HackathonIssue {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  project_id: string;
  issue_number: number;
  org_login: string;
  status: "pending" | "published" | "removed";
  acceptance_criteria: string;
  difficulty_tier: string;
  primary_language: string;
  flagged_for_admin: boolean;
  flagged_reason: string | null;
  synced_at: string;
  published_at: string | null;
}

export interface HackathonConfigSetting {
  key: string;
  type: string;
  section: string;
  description: string;
  valid_range?: string;
  active: boolean;
  default: string;
  value: string;
  overridden: boolean;
}

export interface HackathonConfigAuditEntry {
  id: string;
  hackathon_id: string | null;
  key: string;
  old_value: string | null;
  new_value: string | null;
  actor_user_id: string | null;
  actor_login: string | null;
  created_at: string;
}

// Public
export const getHackathons = () => apiRequest<{ hackathons: Hackathon[] }>("/hackathons");
export const getHackathon = (id: string) => apiRequest<Hackathon>(`/hackathons/${id}`);

// Project-owner-facing
export const applyToHackathon = (
  hackathonId: string,
  data: {
    project_ids: string[];
    short_description: string;
    goal: string;
    expected_issue_count: number;
    maintainer_contact: string;
  },
) =>
  apiRequest<{ application_ids: string[] }>(`/hackathons/${hackathonId}/applications`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMyHackathonApplications = () =>
  apiRequest<{ applications: HackathonApplication[] }>("/hackathon-applications/me", {
    requiresAuth: true,
  });

// Maintainer-facing (owner-or-admin, not admin-only)
export const getHackathonIssuesForProject = (projectId: string) =>
  apiRequest<{ issues: HackathonIssue[] }>(`/projects/${projectId}/hackathon-issues`, {
    requiresAuth: true,
  });

export const getHackathonIssue = (projectId: string, issueNumber: number) =>
  apiRequest<HackathonIssue>(`/projects/${projectId}/hackathon-issues/${issueNumber}`, {
    requiresAuth: true,
  });

export const updateHackathonIssueFields = (
  projectId: string,
  issueNumber: number,
  data: { acceptance_criteria?: string; difficulty_tier?: string; primary_language?: string },
) =>
  apiRequest<HackathonIssue>(`/projects/${projectId}/hackathon-issues/${issueNumber}`, {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify(data),
  });

// Admin - hackathon lifecycle
export const createHackathon = (name: string) =>
  apiRequest<{ id: string }>("/admin/hackathons", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const getAdminHackathons = () =>
  apiRequest<{ hackathons: Hackathon[] }>("/admin/hackathons", { requiresAuth: true });

export const getAdminHackathon = (id: string) =>
  apiRequest<{ hackathon: Hackathon; next_phase: string; blocking_reasons: HackathonBlockingReason[] }>(
    `/admin/hackathons/${id}`,
    { requiresAuth: true },
  );

export const updateHackathon = (
  id: string,
  data: Partial<{
    name: string;
    announced_at: string;
    application_period_start: string;
    application_period_end: string;
    issue_prep_start: string;
    starts_at: string;
    ends_at: string;
    merge_grace_period_hours: number;
    contributor_prize_pool: number;
    maintainer_prize_pool: number;
  }>,
) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathons/${id}`, {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify(data),
  });

export const transitionHackathon = (id: string, toPhase: string) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathons/${id}/transition`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ to_phase: toPhase }),
  });

// Admin - project applications review queue
export const getAdminHackathonApplications = (hackathonId: string, status: string = "pending") =>
  apiRequest<{ applications: HackathonApplication[] }>(
    `/admin/hackathons/${hackathonId}/applications?status=${encodeURIComponent(status)}`,
    { requiresAuth: true },
  );

export const getHackathonApplicationSignals = (applicationId: string, refresh: boolean = false) =>
  apiRequest<HackathonApplicationSignals>(
    `/admin/hackathons/applications/${applicationId}/signals${refresh ? "?refresh=true" : ""}`,
    { requiresAuth: true },
  );

export const acceptHackathonApplication = (applicationId: string) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathons/applications/${applicationId}/accept`, {
    requiresAuth: true,
    method: "POST",
  });

export const rejectHackathonApplication = (applicationId: string, reason: string) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathons/applications/${applicationId}/reject`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const requestMoreInfoHackathonApplication = (applicationId: string, reason: string) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathons/applications/${applicationId}/request-more-info`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason }),
  });

// Admin - issues
export const getAdminHackathonIssues = (
  hackathonId: string,
  params?: { status?: string; flagged?: boolean },
) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.flagged) q.set("flagged", "true");
  const qs = q.toString();
  return apiRequest<{ issues: HackathonIssue[] }>(
    `/admin/hackathons/${hackathonId}/issues${qs ? `?${qs}` : ""}`,
    { requiresAuth: true },
  );
};

// Admin - config settings
export const getHackathonConfigSettings = (hackathonId?: string) =>
  apiRequest<{ settings: HackathonConfigSetting[] }>(
    `/admin/hackathon-config${hackathonId ? `?hackathon_id=${encodeURIComponent(hackathonId)}` : ""}`,
    { requiresAuth: true },
  );

export const updateHackathonConfigSetting = (data: {
  hackathon_id?: string | null;
  key: string;
  value: string;
}) =>
  apiRequest<{ ok: boolean }>("/admin/hackathon-config", {
    requiresAuth: true,
    method: "PUT",
    body: JSON.stringify(data),
  });

export const resetHackathonConfigSetting = (data: { hackathon_id: string; key: string }) =>
  apiRequest<{ ok: boolean }>("/admin/hackathon-config/reset", {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify(data),
  });

export const getHackathonConfigAudit = (params?: {
  key?: string;
  hackathon_id?: string;
  limit?: number;
  offset?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.key) q.set("key", params.key);
  if (params?.hackathon_id) q.set("hackathon_id", params.hackathon_id);
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset) q.set("offset", String(params.offset));
  const qs = q.toString();
  return apiRequest<{ entries: HackathonConfigAuditEntry[] }>(
    `/admin/hackathon-config/audit${qs ? `?${qs}` : ""}`,
    { requiresAuth: true },
  );
};

// ---------------------------------------------------------------------------
// GrainHack (AI-specs.md) - Slice 2: the assignment pipeline (§4).
// Contributors apply to issues, hard gates screen them, a seeded weighted
// draw assigns the issue when the application window closes.
// ---------------------------------------------------------------------------

export interface HackathonIssueApplication {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  hackathon_issue_id: string;
  project_id: string;
  repo_full_name: string;
  issue_number: number;
  status: "applied" | "rejected_gate" | "won" | "lost" | "withdrawn";
  /** The specific §4.1 gate that rejected this application, shown verbatim. */
  gate_failure_reason: string | null;
  fit: "strong" | "plausible" | "weak" | null;
  application_window_closes_at: string | null;
  created_at: string;
}

export interface HackathonAssignment {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  hackathon_issue_id: string;
  repo_full_name: string;
  issue_number: number;
  github_login: string;
  status:
    | "active"
    | "pr_submitted"
    | "completed"
    | "released_stale"
    | "released_voluntary"
    | "released_event_end";
  /** Separate from status: with slot_freed_on = pr_submission a slot frees
   * while the assignment is still open, so "holds a slot" is not "active". */
  holds_slot: boolean;
  assigned_at: string;
  /** Null once a qualifying PR exists - review latency must not cost the
   * contributor their assignment. */
  stale_at: string | null;
  release_reason: string | null;
  abandon_recorded: boolean;
  qualifying_pr_number: number | null;
}

/** One applicant's ticket arithmetic, broken out per factor. The breakdown
 * (not just the total) is what makes "why didn't I get it" answerable. */
export interface HackathonDrawCandidate {
  user_id: string;
  github_login: string;
  fit: string;
  is_newcomer: boolean;
  weights: Record<string, number>;
  tickets: number;
}

export interface HackathonDraw {
  id: string;
  hackathon_issue_id: string;
  repo_full_name: string;
  issue_number: number;
  /** Stored so any draw can be replayed exactly during an appeal (§4.5). */
  seed: number;
  pool: HackathonDrawCandidate[];
  pool_size: number;
  winner_user_id: string | null;
  winner_login: string | null;
  used_weak_pool: boolean;
  reservation_applied: boolean;
  reservation_fell_back: boolean;
  first_come_fallback: boolean;
  no_winner_reason: string | null;
  is_simulation: boolean;
  created_at: string;
}

/** RunDraw's own return shape, which the simulate endpoint echoes back
 * directly - note it uses draw_id/hackathon_issue_id rather than the
 * list endpoint's id/issue fields. */
export interface HackathonDrawResult {
  draw_id: string;
  hackathon_issue_id: string;
  seed: number;
  pool: HackathonDrawCandidate[];
  winner_user_id: string | null;
  winner_login?: string;
  used_weak_pool: boolean;
  reservation_applied: boolean;
  reservation_fell_back: boolean;
  first_come_fallback: boolean;
  no_winner_reason?: string;
  is_simulation: boolean;
}

export interface AdminHackathonAssignment {
  id: string;
  hackathon_issue_id: string;
  repo_full_name: string;
  issue_number: number;
  github_login: string;
  org_login: string;
  status: string;
  holds_slot: boolean;
  assigned_at: string;
  stale_at: string | null;
  qualifying_pr_number: number | null;
  release_reason: string | null;
  abandon_recorded: boolean;
  /** §4.2's collusion signal: evidence for a human, never a gate. */
  prior_association: {
    shared_org?: boolean;
    merged_prs_by_maintainer?: number;
    frequent_merge_relation?: boolean;
    prior_grainhack_co_occurrence?: number;
    accounts_created_within_7_days?: boolean | null;
    score?: number;
  } | null;
}

// Contributor-facing
export const applyToHackathonIssue = (
  hackathonIssueId: string,
  applicationText?: string,
) =>
  apiRequest<{ id: string; status: string }>(
    `/hackathon-issues/${hackathonIssueId}/apply`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify({ application_text: applicationText ?? "" }),
    },
  );

export const getMyHackathonIssueApplications = () =>
  apiRequest<{ applications: HackathonIssueApplication[] }>(
    "/hackathon-issue-applications/me",
    { requiresAuth: true },
  );

export const getMyHackathonAssignments = () =>
  apiRequest<{ assignments: HackathonAssignment[] }>("/hackathon-assignments/me", {
    requiresAuth: true,
  });

export const releaseHackathonAssignment = (assignmentId: string) =>
  apiRequest<{ ok: boolean; abandon_recorded: boolean }>(
    `/hackathon-assignments/${assignmentId}/release`,
    { requiresAuth: true, method: "POST" },
  );

// Admin - draws and assignments
export const simulateHackathonDraw = (hackathonIssueId: string, seed?: number) =>
  apiRequest<HackathonDrawResult>(
    `/admin/hackathon-issues/${hackathonIssueId}/simulate-draw`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify(seed ? { seed } : {}),
    },
  );

export const getHackathonDraws = (
  hackathonId: string,
  params?: { issue_id?: string; include_simulations?: boolean },
) => {
  const q = new URLSearchParams();
  if (params?.issue_id) q.set("issue_id", params.issue_id);
  if (params?.include_simulations) q.set("include_simulations", "true");
  const qs = q.toString();
  return apiRequest<{ draws: HackathonDraw[] }>(
    `/admin/hackathons/${hackathonId}/draws${qs ? `?${qs}` : ""}`,
    { requiresAuth: true },
  );
};

export const getAdminHackathonAssignments = (hackathonId: string, status?: string) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<{ assignments: AdminHackathonAssignment[] }>(
    `/admin/hackathons/${hackathonId}/assignments${qs}`,
    { requiresAuth: true },
  );
};

/** Contributor-visible view of a GrainHack issue. Distinct from
 * HackathonIssue (the maintainer/admin shape) - readable by any signed-in
 * user, and carries none of the admin-only fields. */
export interface ContributorHackathonIssue {
  id: string;
  hackathon_id: string;
  hackathon_name: string;
  project_id: string;
  issue_number: number;
  status: "pending" | "published" | "removed";
  acceptance_criteria: string;
  difficulty_tier: string;
  primary_language: string;
  reserved: boolean;
  application_window_opens_at: string | null;
  application_window_closes_at: string | null;
}

/** One round trip for everything the apply panel needs. 404s when the issue
 * isn't in a GrainHack, which is the common case. */
export const getContributorHackathonIssue = (projectId: string, issueNumber: number) =>
  apiRequest<{
    issue: ContributorHackathonIssue;
    /** Set only when the pool is shown exactly - see applicant_visibility. */
    applicant_count: number | null;
    /** Set only when bucketing: "none" | "few" | "many". */
    applicant_bucket: string;
    applicant_visibility: "hidden" | "bucketed" | "exact";
    my_application: HackathonIssueApplication | null;
  }>(`/projects/${projectId}/grainhack/${issueNumber}`, { requiresAuth: true });

export interface GrainHackRule {
  key: string;
  value: string;
  type: string;
  section: string;
  description: string;
  valid_range?: string;
  active: boolean;
  /** Present when the rule is real but its value cannot be quoted: the
   *  authority is a contract that is not deployed yet. The page shows the
   *  reason instead of a number, rather than publishing a figure nothing
   *  enforces. */
  unenforced?: string;
}

export interface GrainHackRules {
  /** "snapshot" once an event is live and reading its own frozen copy;
   * "not_yet_frozen" before that; "global_defaults" with no hackathon. */
  source: "snapshot" | "not_yet_frozen" | "global_defaults";
  hackathon_id: string | null;
  hackathon_name: string;
  phase: string;
  rules: GrainHackRule[];
  section_order: string[];
  structural: {
    prior_completion_cap: number;
    prior_completion_cap_note: string;
  };
}

/** Public - no auth. These are the rules contributors read before applying. */
export const getGrainHackRules = (hackathonId?: string) =>
  apiRequest<GrainHackRules>(
    `/grainhack/rules${hackathonId ? `?hackathon_id=${encodeURIComponent(hackathonId)}` : ""}`,
  );

// ---------------------------------------------------------------------------
// GrainHack §5 judging - admin review.
// ---------------------------------------------------------------------------

/** One acceptance criterion as the judge assessed it. §5.5 rule 3 requires
 * evidence be a citation a human can verify, which is why `evidence` is a
 * free-text pointer at a file and line range rather than a summary. */
export interface VerdictCriterion {
  text: string;
  met: boolean;
  evidence: string;
}

/** §5.3's judge output schema. */
export interface VerdictPayload {
  criteria?: VerdictCriterion[];
  criteria_met?: number;
  criteria_total?: number;
  scope?: "in_scope" | "partial" | "out_of_scope";
  substance?: "trivial" | "routine" | "core_logic";
  bucket?: string;
  confidence?: "low" | "medium" | "high";
  concerns?: string[];
  reasoning?: string;
}

/** §5.3's diff_stats, computed in code so nothing in the diff can
 * misrepresent its own size. */
export interface VerdictDiffStats {
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  generated_lines: number;
  lockfile_lines: number;
  test_lines: number;
  tests_added: boolean;
  touches_core_paths: boolean;
  meaningful_lines: number;
  docs_only: boolean;
}

export interface HackathonVerdict {
  id: string;
  hackathon_id: string;
  hackathon_issue_id: string | null;
  project_id: string;
  repo_full_name: string;
  pr_number: number;
  issue_number: number | null;
  github_login: string;
  prefilter_status: "pending" | "passed" | "rejected";
  prefilter_reason: string | null;
  diff_stats: VerdictDiffStats | null;

  duplicate_of_verdict_id: string | null;
  duplicate_similarity: number | null;
  duplicate_flagged: boolean;

  judge_bucket: string | null;
  judge_confidence: string | null;
  judge_payload: VerdictPayload | null;
  judge_model: string | null;
  cross_check_bucket: string | null;
  cross_check_payload: VerdictPayload | null;
  cross_check_model: string | null;
  escalation_bucket: string | null;
  escalation_payload: VerdictPayload | null;

  needs_human_review: boolean;
  review_reason: string | null;
  final_bucket: string | null;
  final_source: string | null;
  overridden_by: string | null;
  override_reason: string | null;
  overridden_at: string | null;

  units: number | null;
  payout_amount: string | null;
  created_at: string;
  updated_at: string;
  /** Pins citation links to the diff as merged. */
  merge_commit_sha: string | null;
}

/** §5.6's disagreement rate and the counts around it. */
export interface JudgingStats {
  total: number;
  /** Verdicts where both a judge and a cross-check returned a bucket. A
   * missing cross-check is not a disagreement, so it isn't a sample. */
  both_judged: number;
  disagreements: number;
  /** Null when nothing has been double-judged - a rate over zero samples is
   * unknown, not zero, and 0% would read as perfect agreement. */
  disagreement_rate: number | null;
  expected_range_low: number;
  expected_range_high: number;
  needs_review: number;
  overridden: number;
  prefiltered_out: number;
  cross_checked: number;
  injection_flagged: number;
  /** "substantial -> accepted" -> count. Says *where* the ambiguity is. */
  disagreement_by_pair: Record<string, number>;
}

export const getHackathonVerdicts = (
  hackathonId: string,
  params?: { status?: string; bucket?: string },
) => {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.bucket) q.set("bucket", params.bucket);
  const qs = q.toString();
  return apiRequest<{
    verdicts: HackathonVerdict[];
    shadow_mode: boolean;
    stats: JudgingStats | null;
  }>(`/admin/hackathons/${hackathonId}/verdicts${qs ? `?${qs}` : ""}`, { requiresAuth: true });
};

export const getHackathonVerdict = (verdictId: string) =>
  apiRequest<{ verdict: HackathonVerdict; shadow_mode: boolean }>(
    `/admin/hackathon-verdicts/${verdictId}`,
    { requiresAuth: true },
  );

export const overrideHackathonVerdict = (verdictId: string, bucket: string, reason: string) =>
  apiRequest<{ ok: boolean; final_bucket: string }>(
    `/admin/hackathon-verdicts/${verdictId}/override`,
    {
      requiresAuth: true,
      method: "POST",
      body: JSON.stringify({ bucket, reason }),
    },
  );

// ---------------------------------------------------------------------------
// GrainHack §6 - appeals
// ---------------------------------------------------------------------------

/** When appeals open and close for a hackathon. Anchored to the moment
 *  results were actually published, not to a planned date. */
export interface AppealWindow {
  days: number;
  opens_at: string | null;
  closes_at: string | null;
  open: boolean;
  closed_out_at: string | null;
}

export interface HackathonAppeal {
  id: string;
  verdict_id: string;
  github_login: string;
  reason: string;
  status: "pending" | "upheld" | "rejected";
  decision_reason: string | null;
  decided_bucket: string | null;
  decided_at: string | null;
  created_at: string;
  /** Only present on the admin queue: §6 requires the appeal to reach a human
   *  with both model verdicts and the diff already in front of them. */
  verdict?: HackathonVerdict;
}

/** One of the caller's own verdicts, plus their appeal against it if any.
 *  Returns nothing before results are published. */
export interface MyVerdictEntry {
  verdict: HackathonVerdict;
  phase: string;
  appeal?: HackathonAppeal;
}

export const getMyGrainHackVerdicts = () =>
  apiRequest<{ verdicts: MyVerdictEntry[] }>("/grainhack/my-verdicts", {
    requiresAuth: true,
  });

export const getVerdictAppealWindow = (verdictId: string) =>
  apiRequest<AppealWindow>(`/grainhack/verdicts/${verdictId}/appeal-window`, {
    requiresAuth: true,
  });

export const appealVerdict = (verdictId: string, reason: string) =>
  apiRequest<{ id: string }>(`/grainhack/verdicts/${verdictId}/appeal`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const getHackathonAppeals = (hackathonId: string, status?: string) =>
  apiRequest<{ appeals: HackathonAppeal[]; appeal_window: AppealWindow }>(
    `/admin/hackathons/${hackathonId}/appeals${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    { requiresAuth: true },
  );

export const decideHackathonAppeal = (
  appealId: string,
  upheld: boolean,
  reason: string,
  bucket?: string,
) =>
  apiRequest<{ ok: boolean }>(`/admin/hackathon-appeals/${appealId}/decide`, {
    requiresAuth: true,
    method: "POST",
    body: JSON.stringify({ upheld, reason, bucket: bucket ?? "" }),
  });
