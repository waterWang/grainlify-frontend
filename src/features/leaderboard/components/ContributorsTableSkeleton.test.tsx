// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { ContributorsTableSkeleton } from './ContributorsTableSkeleton'
import { renderWithTheme } from '../../../test/renderWithTheme'

describe('ContributorsTableSkeleton', () => {
  it('renders skeleton loaders in header and each row', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })

    // Verify skeleton loaders are present
    const skeletons = container.querySelectorAll('[data-testid="skeleton-loader"]')
    expect(skeletons.length).toBeGreaterThan(40)
  })

  it('renders 10 rows with correct structure', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })

    // 10 rows, each is a grid with 12 columns
    const rows = container.querySelectorAll('.grid.grid-cols-12.gap-4.px-8.py-5')
    expect(rows.length).toBe(10)

    // Header row should have 12 column grid as well
    const header = container.querySelectorAll('.grid.grid-cols-12.gap-4.px-8.py-4')
    expect(header.length).toBe(1)
  })

  it('renders dark-mode container classes when theme is dark', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'dark' })

    // The outer container should have dark-mode background
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('bg-[#2d2820]/[0.4]')
    expect(outerDiv.className).toContain('border-white/10')
  })

  it('renders light-mode container classes when theme is light', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })

    // The outer container should have light-mode background
    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toContain('bg-white/[0.12]')
    expect(outerDiv.className).toContain('border-white/20')
  })

  it('renders dark-mode header row classes when theme is dark', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'dark' })

    // The header row should have dark-mode background
    const headerDiv = container.querySelector('.grid.grid-cols-12.gap-4.px-8.py-4') as HTMLElement
    expect(headerDiv.className).toContain('bg-white/[0.04]')
  })

  it('renders light-mode header row classes when theme is light', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })

    // The header row should have light-mode background
    const headerDiv = container.querySelector('.grid.grid-cols-12.gap-4.px-8.py-4') as HTMLElement
    expect(headerDiv.className).toContain('bg-white/[0.08]')
  })

  it('renders dark-mode divider classes when theme is dark', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'dark' })

    const dividerContainer = container.querySelector('.divide-y')
    expect(dividerContainer?.className).toContain('divide-white/[0.06]')
  })

  it('renders light-mode divider classes when theme is light', () => {
    const { container } = renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })

    const dividerContainer = container.querySelector('.divide-y')
    expect(dividerContainer?.className).toContain('divide-white/10')
  })

  it('renders consistently under both themes without errors', () => {
    // Should not throw when rendered with either theme
    expect(() =>
      renderWithTheme(<ContributorsTableSkeleton />, { theme: 'light' })
    ).not.toThrow()

    expect(() =>
      renderWithTheme(<ContributorsTableSkeleton />, { theme: 'dark' })
    ).not.toThrow()
  })
})