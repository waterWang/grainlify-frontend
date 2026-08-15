import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptimisticData } from './useOptimisticData'

describe('useOptimisticData', () => {
  beforeEach(() => {
    // The hook's catch branch logs via console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with isLoading true before any fetch resolves', () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasError).toBe(false)
    expect(result.current.data).toEqual([])
  })

  it('resolves with the fetched data and clears isLoading/hasError on success', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    const payload = ['a', 'b']
    const fetchFn = vi.fn().mockResolvedValue(payload)

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(payload)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('REGRESSION: clears isLoading (does not stay stuck true) when the fetcher rejects', async () => {
    const { result } = renderHook(() => useOptimisticData<string[]>([]))
    const fetchFn = vi.fn().mockRejectedValue(new Error('network down'))

    await act(async () => {
      await result.current.fetchData(fetchFn)
    })

    expect(result.current.hasError).toBe(true)
    // This is the exact regression this suite guards against: previously the
    // catch block only cleared isLoading on one of two error branches, so a
    // rejected fetch could leave the UI spinning forever.
    expect(result.current.isLoading).toBe(false)
  })

  it('serves a second fetchData call from cache within cacheDuration, without re-invoking the fetcher', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    expect(result.current.data).toEqual(['first'])

    await act(async () => {
      await result.current.fetchData(second)
    })

    expect(second).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(['first'])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('forceRefresh bypasses the cache and re-invokes the fetcher with fresh data', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    await act(async () => {
      await result.current.fetchData(second, true)
    })

    expect(second).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['second'])
  })

  it('clearCache forces the next fetchData call to bypass the cache even without forceRefresh', async () => {
    const { result } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 })
    )
    const first = vi.fn().mockResolvedValue(['first'])
    const second = vi.fn().mockResolvedValue(['second'])

    await act(async () => {
      await result.current.fetchData(first)
    })
    act(() => {
      result.current.clearCache()
    })
    await act(async () => {
      await result.current.fetchData(second)
    })

    expect(second).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(['second'])
  })
})

// ---------------------------------------------------------------------------
// The two properties that make the infinite-fetch bug impossible rather than
// documented. It shipped three times (BrowsePage, DiscoverPage, DiscoverPage
// again) while a comment in the hook warned callers not to cause it.
//
// Measured on the dashboard with the API unreachable, before the fix:
// 26,739 requests to /projects/recommended in 5 seconds.
// ---------------------------------------------------------------------------

describe('useOptimisticData: fetchData has a permanently stable identity', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not change identity across re-renders, even with an inline initialData', async () => {
    // `useOptimisticData<T[]>([], ...)` is how every call site writes it, and
    // that literal is a NEW array on every render. When initialData was a
    // dependency of the callback, this alone gave fetchData a new identity per
    // render - so any caller with fetchData in a useEffect dep array re-ran
    // that effect forever.
    const { result, rerender } = renderHook(() =>
      useOptimisticData<string[]>([], { cacheDuration: 30000 }),
    )
    const first = result.current.fetchData

    rerender()
    rerender()
    expect(result.current.fetchData).toBe(first)

    // Still stable after data actually changes - the other half of the old
    // instability, since the callback closed over `data`.
    await act(async () => {
      await result.current.fetchData(async () => ['a'])
    })
    expect(result.current.data).toEqual(['a'])
    expect(result.current.fetchData).toBe(first)

    rerender()
    expect(result.current.fetchData).toBe(first)
  })

  it('clearCache is stable too, so it is safe in a dependency array', () => {
    const { result, rerender } = renderHook(() => useOptimisticData<string[]>([]))
    const first = result.current.clearCache
    rerender()
    expect(result.current.clearCache).toBe(first)
  })
})

describe('useOptimisticData: failures back off instead of hammering', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('refuses to re-invoke the fetcher while inside the backoff window', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    await act(async () => {
      await result.current.fetchData(fetcher)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.hasError).toBe(true)

    // The loop that motivated this called with forceRefresh. Ten immediate
    // retries must produce zero further network calls.
    await act(async () => {
      for (let i = 0; i < 10; i++) await result.current.fetchData(fetcher, true)
    })
    expect(
      fetcher,
      'a caller retrying in a loop must not reach the network while backing off',
    ).toHaveBeenCalledTimes(1)

    // isLoading must not be left stuck true by the early return, or the UI
    // shows a spinner forever.
    expect(result.current.isLoading).toBe(false)
  })

  it('retries once the backoff has elapsed, and one success resets it', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['ok'])
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    await act(async () => {
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // First backoff step is 1s.
    await act(async () => {
      vi.advanceTimersByTime(1100)
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.data).toEqual(['ok'])
    expect(result.current.hasError).toBe(false)

    // Reset: a subsequent failure starts from the first step again rather than
    // inheriting the earlier count.
    fetcher.mockRejectedValueOnce(new Error('down again'))
    await act(async () => {
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
    await act(async () => {
      vi.advanceTimersByTime(1100)
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('backs off further on each consecutive failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    await act(async () => {
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // After one failure the window is 1s; after two it is 2s, so a 1.1s wait
    // is enough for the second attempt but not the third.
    await act(async () => {
      vi.advanceTimersByTime(1100)
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)

    await act(async () => {
      vi.advanceTimersByTime(1100)
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher, 'the second failure should have doubled the window to 2s').toHaveBeenCalledTimes(2)

    await act(async () => {
      vi.advanceTimersByTime(1100)
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('clearCache resets the breaker, so an explicit retry is not made to wait', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useOptimisticData<string[]>([]))

    await act(async () => {
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // A user pressing "try again" should go immediately.
    await act(async () => {
      result.current.clearCache()
      await result.current.fetchData(fetcher, true)
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
