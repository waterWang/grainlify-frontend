import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useThemeToggleAnimation } from './useThemeToggleAnimation'

// Minimal fake DOM node satisfying just what the hook reads off ref.current.
function attachFakeRef(
  ref: { current: HTMLButtonElement | null },
  rect: { top: number; left: number; width: number; height: number }
) {
  ref.current = {
    getBoundingClientRect: () => rect,
  } as unknown as HTMLButtonElement
}

function mockMatchMedia(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList)
}

// jsdom does not implement the Web Animations API, so document.documentElement.animate
// is typically absent. Stub it in if missing, then spy on it either way.
function spyOnAnimate() {
  if (typeof document.documentElement.animate !== 'function') {
    ;(document.documentElement as unknown as { animate: unknown }).animate = () =>
      ({}) as Animation
  }
  return vi.spyOn(document.documentElement, 'animate').mockReturnValue({} as Animation)
}

describe('useThemeToggleAnimation', () => {
  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition
    vi.restoreAllMocks()
  })

  it('falls back to calling onToggle directly when startViewTransition is unsupported', () => {
    expect(typeof (document as { startViewTransition?: unknown }).startViewTransition).toBe(
      'undefined'
    )
    mockMatchMedia(false)
    const animateSpy = spyOnAnimate()
    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    expect(() => result.current.toggleWithAnimation()).not.toThrow()

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('falls back to calling onToggle directly when prefers-reduced-motion matches, even if startViewTransition exists', () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      }
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = startViewTransition
    mockMatchMedia(true)
    const animateSpy = spyOnAnimate()
    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    result.current.toggleWithAnimation()

    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(startViewTransition).not.toHaveBeenCalled()
    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('runs the View Transition animation path when supported and motion is allowed', async () => {
    mockMatchMedia(false)
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      }
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = startViewTransition
    const animateSpy = spyOnAnimate()

    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })

    const onToggle = vi.fn()
    const { result } = renderHook(() => useThemeToggleAnimation({ onToggle }))
    // The rect only has to exist - the hook bails without a ref. Its position
    // no longer affects the animation: the wipe is anchored at the viewport's
    // top-left corner, not at the toggle, so unlike the old circle reveal
    // there is no geometry here to assert against.
    attachFakeRef(result.current.ref, { top: 100, left: 200, width: 50, height: 40 })

    result.current.toggleWithAnimation()

    expect(startViewTransition).toHaveBeenCalledTimes(1)
    // The callback passed to startViewTransition calls onToggle synchronously
    // (wrapped in flushSync in the real implementation).
    expect(onToggle).toHaveBeenCalledTimes(1)

    await waitFor(() => expect(animateSpy).toHaveBeenCalledTimes(1))

    const [keyframes, options] = animateSpy.mock.calls[0]
    // A single property-indexed keyframes object (`{ clipPath: [...] }`),
    // not an array of keyframe objects.
    expect(Array.isArray(keyframes)).toBe(false)

    // The animation is a diagonal gold wipe: a triangle anchored at the
    // top-left whose legs grow past the viewport, so its hypotenuse sweeps
    // across as a straight edge. Three keyframes, not two - the middle one is
    // the moment the edge crosses the corner, and dropping it would turn the
    // sweep into a linear scale of the final triangle.
    const clipPath = (keyframes as { clipPath: string[] }).clipPath
    expect(clipPath).toEqual([
      'polygon(0% 0%, 0% 0%, 0% 0%)',
      'polygon(0% 0%, 100% 0%, 0% 100%)',
      'polygon(0% 0%, 200% 0%, 0% 200%)',
    ])

    // The glow rides the edge via a filter on the same pseudo-element rather
    // than a separate DOM node: ::view-transition-* render in the browser's
    // top layer, above any normal element, so an overlay div would be
    // invisible for the whole transition.
    const filter = (keyframes as { filter: string[] }).filter
    expect(filter).toHaveLength(3)
    expect(filter[0]).toMatch(/^drop-shadow\(0 0 0px /)
    expect(filter[1]).toMatch(/^drop-shadow\(0 0 36px /)
    expect(filter[2]).toMatch(/^drop-shadow\(0 0 8px /)

    expect(options).toMatchObject({
      duration: 2000,
      easing: 'cubic-bezier(0.19, 1, 0.22, 1)',
      pseudoElement: '::view-transition-new(root)',
    })
  })
})
