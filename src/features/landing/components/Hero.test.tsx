import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Hero } from './Hero'

// Mock the useLandingStats hook
vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: vi.fn(),
}))

// Hero only reads `theme` from context; stub it directly rather than mounting
// the real ThemeProvider (avoids pulling in its localStorage bootstrapping).
vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

import { useLandingStats } from '../../../shared/hooks/useLandingStats'

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>
  )
}

describe('Hero component layout shift prevention', () => {
  it('renders skeleton placeholders while loading', () => {
    vi.mocked(useLandingStats).mockReturnValue({
      stats: null,
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })
    renderHero()
    // Image placeholder should be present
    expect(screen.getByTestId('hero-image-placeholder')).toBeInTheDocument()
    // Stat skeletons should be present
    const skeletons = screen.getAllByTestId('stat-skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('shows actual stats after loading', () => {
    vi.mocked(useLandingStats).mockReturnValue({
      stats: null,
      display: { activeProjects: '10', contributors: '200', grantsDistributed: '5000' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderHero()
    expect(screen.queryByTestId('stat-skeleton')).not.toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('5000')).toBeInTheDocument()
  })
})
