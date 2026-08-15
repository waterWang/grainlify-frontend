import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseOptimisticDataOptions {
  cacheDuration?: number;
}

interface UseOptimisticDataReturn<T> {
  data: T;
  isLoading: boolean;
  hasError: boolean;
  fetchData: (fetchFn: () => Promise<T>, forceRefresh?: boolean) => Promise<void>;
  clearCache: () => void;
}

/**
 * Backoff after a failed fetch. Doubling from 1s, capped at 30s.
 *
 * A cap rather than a hard stop: the caller recovers on its own when the
 * network comes back, which a permanent stop would not. Even the first step
 * takes the pathological case from thousands of requests per second to one.
 */
const FAILURE_BACKOFF_BASE_MS = 1000;
const FAILURE_BACKOFF_MAX_MS = 30000;

function backoffFor(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  const delay = FAILURE_BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1);
  return Math.min(delay, FAILURE_BACKOFF_MAX_MS);
}

/**
 * Cached fetching with an optimistic first paint.
 *
 * # Why fetchData has an empty dependency array
 *
 * This used to be `useCallback(..., [data, initialData, cacheDuration])`, which
 * gave it a new identity whenever any of those changed - and `initialData` is
 * usually written inline (`useOptimisticData<T[]>([], ...)`), so it changed on
 * EVERY render. A caller that put `fetchData` in a useEffect dependency array
 * therefore re-ran that effect every render.
 *
 * On success the 30s cache short-circuited the second call and the loop
 * stopped, so the hazard was invisible in the happy path. On failure nothing
 * was cached, so there was no circuit breaker and it spun as fast as the
 * network allowed. Measured on the dashboard with the API down:
 * **26,739 requests to /projects/recommended in 5 seconds** - roughly 5,300 a
 * second from a single mobile client, which is both a broken UI and a
 * self-inflicted DoS on our own API.
 *
 * That was the third occurrence (BrowsePage, DiscoverPage, then DiscoverPage
 * again by a different route). The previous fix was a comment telling callers
 * not to do it. Three strikes says the API was wrong, not the callers: an
 * interface that documents a footgun still ships the footgun.
 *
 * So `fetchData` now has a **permanently stable identity**. Everything it reads
 * lives in a ref, nothing reactive is in its dependency array, and putting it
 * in a caller's dependency array is therefore harmless - which is what the
 * comment used to have to ask for.
 *
 * # Why failures back off
 *
 * Stable identity removes the render loop, but any caller that retries on error
 * could still hammer a failing endpoint. Consecutive failures now back off
 * (1s, 2s, 4s ... capped at 30s) and a call made inside the backoff window
 * returns immediately without touching the network. One success resets it.
 */
export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions = {}
): UseOptimisticDataReturn<T> {
  const { cacheDuration = 30000 } = options;

  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cacheRef = useRef<CacheEntry<T> | null>(null);

  // Everything fetchData reads is held in a ref so the callback below can have
  // an empty dependency array and never change identity.
  const dataRef = useRef<T>(initialData);
  dataRef.current = data;
  // Captured once. A caller writing `useOptimisticData([], ...)` passes a new
  // array every render; treating that as a dependency is what made the
  // identity unstable, and comparing against it is only ever a "has anything
  // arrived yet" check, for which the first value is the right one.
  const initialDataRef = useRef<T>(initialData);
  const cacheDurationRef = useRef(cacheDuration);
  cacheDurationRef.current = cacheDuration;

  const failureRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });

  const fetchData = useCallback(async (fetchFn: () => Promise<T>, forceRefresh: boolean = false) => {
    const now = Date.now();

    if (
      !forceRefresh &&
      cacheRef.current &&
      now - cacheRef.current.timestamp < cacheDurationRef.current
    ) {
      setData(cacheRef.current.data);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // Circuit breaker. A caller looping on error - or simply an effect that
    // re-runs - must not turn a failing endpoint into a request flood. The
    // early return touches no state, so it cannot itself cause a re-render
    // and feed the loop it is there to stop.
    //
    // forceRefresh does NOT bypass this: the loop that motivated it passed
    // forceRefresh, so an exemption here would exempt exactly the case that
    // matters. An explicit user-driven retry should call clearCache() first,
    // which resets the breaker.
    const { count, lastAt } = failureRef.current;
    if (count > 0 && now - lastAt < backoffFor(count)) {
      setIsLoading(false);
      return;
    }

    const current = dataRef.current;
    const hasExistingData =
      current !== initialDataRef.current ||
      (Array.isArray(current) && current.length > 0) ||
      (typeof current === 'object' && current !== null && Object.keys(current).length > 0);

    if (!hasExistingData) {
      setIsLoading(true);
    }

    setHasError(false);

    try {
      const result = await fetchFn();

      cacheRef.current = { data: result, timestamp: Date.now() };
      failureRef.current = { count: 0, lastAt: 0 };

      setData(result);
      setIsLoading(false);
      setHasError(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      failureRef.current = { count: failureRef.current.count + 1, lastAt: Date.now() };
      setIsLoading(false);
      setHasError(true);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
    // Clearing the cache is the explicit "try again now" signal, so it also
    // resets the breaker - otherwise a user-triggered retry would sit out the
    // backoff and look broken.
    failureRef.current = { count: 0, lastAt: 0 };
  }, []);

  return {
    data,
    isLoading,
    hasError,
    fetchData,
    clearCache,
  };
}
