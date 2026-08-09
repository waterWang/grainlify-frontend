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

export function useOptimisticData<T>(
  initialData: T,
  options: UseOptimisticDataOptions = {}
): UseOptimisticDataReturn<T> {
  const { cacheDuration = 30000 } = options;
  
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const cacheRef = useRef<CacheEntry<T> | null>(null);

  // GOTCHA (hit twice already - BrowsePage.tsx and DiscoverPage.tsx,
  // 2026-08-09): this callback closes over `data`, so its identity changes
  // every time a fetch actually resolves with new data. If a caller (a)
  // includes the returned `fetchData` in a useEffect's own dependency array
  // AND (b) ever calls it with forceRefresh=true from that same effect, you
  // get an infinite loop: fetch resolves -> data changes -> fetchData gets
  // a new identity -> the effect re-fires because fetchData "changed" ->
  // fetches again -> forever. The 30s cache normally masks this (a
  // non-forced call after the first one just re-sets state to the SAME
  // cached reference, which React no-ops on), which is exactly why it's
  // easy to add forceRefresh later without noticing the effect was relying
  // on that as an accidental circuit breaker.
  // If you add a new call site that needs forceRefresh: true (or a
  // sometimes-true flag) from an effect, do NOT put the fetch function
  // itself in that effect's dependency array - depend only on the real
  // trigger values (e.g. filters, a boolean toggle) and add an
  // eslint-disable-next-line react-hooks/exhaustive-deps for the
  // intentionally-omitted fetch function.
  const fetchData = useCallback(
    async (fetchFn: () => Promise<T>, forceRefresh: boolean = false) => {
      const now = Date.now();
      
      if (
        !forceRefresh &&
        cacheRef.current &&
        now - cacheRef.current.timestamp < cacheDuration
      ) {
        setData(cacheRef.current.data);
        setIsLoading(false);
        setHasError(false);
        return;
      }

      const hasExistingData = 
        data !== initialData || 
        (Array.isArray(data) && data.length > 0) ||
        (typeof data === 'object' && data !== null && Object.keys(data).length > 0);

      if (!hasExistingData) {
        setIsLoading(true);
      }
      
      setHasError(false);

      try {
        const result = await fetchFn();
        
        cacheRef.current = {
          data: result,
          timestamp: Date.now(),
        };
        
        setData(result);
        setIsLoading(false);
        setHasError(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setIsLoading(false);
        setHasError(true);
      }
    },
    [data, initialData, cacheDuration]
  );

  const clearCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return {
    data,
    isLoading,
    hasError,
    fetchData,
    clearCache,
  };
}