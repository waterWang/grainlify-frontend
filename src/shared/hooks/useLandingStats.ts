import { useCallback, useEffect, useMemo, useState } from 'react'

import { getLandingStats, type LandingStats } from '../api/client'
import { useTranslation } from '../i18n'

type LandingStatsDisplay = {
  activeProjects: string
  contributors: string
  grantsDistributed: string
}

/** Formats an integer count using the active locale's grouping separators. */
const formatCount = (n: number, locale: string) => n.toLocaleString(locale)

/** Formats a USD amount as whole-dollar currency for the active locale. */
const formatUSD = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

/**
 * Fetches landing-page statistics on mount and exposes loading/data/error state.
 *
 * @returns An object containing:
 * - `stats` – the raw API payload, or `null` while loading or after a failure.
 * - `display` – formatted strings ready for rendering; all fields are `'—'` when `stats` is `null`.
 * - `isLoading` – `true` until the request settles (success or failure).
 * - `error` – populated with the caught `Error.message` on failure (or `'Failed to load stats'`
 *   for non-`Error` rejections); `null` on success. Callers are responsible for surfacing this
 *   to the user — the hook does not re-throw.
 *
 * @remarks Unmounting during a pending request is safe: an `isMounted` flag prevents
 * stale state updates after the component is removed from the tree.
 */
export function useLandingStats() {
  const { locale } = useTranslation()
  const [stats, setStats] = useState<LandingStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const s = await getLandingStats()
      setStats(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      setIsLoading(true)
      try {
        const s = await getLandingStats()
        if (!isMounted) return
        setStats(s)
        setError(null)
      } catch (e) {
        if (!isMounted) return
        setError(e instanceof Error ? e.message : 'Failed to load stats')
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const display: LandingStatsDisplay = useMemo(() => {
    if (!stats) {
      return {
        activeProjects: '—',
        contributors: '—',
        grantsDistributed: '—',
      }
    }

    return {
      activeProjects: formatCount(stats.active_projects, locale),
      contributors: formatCount(stats.contributors, locale),
      grantsDistributed: formatUSD(stats.grants_distributed_usd, locale),
    }
  }, [stats, locale])

  return { stats, display, isLoading, error, refetch: fetchStats }
}
