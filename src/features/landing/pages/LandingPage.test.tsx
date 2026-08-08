import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { LandingPage } from './LandingPage'
import { getLandingStats } from '../../../shared/api/client'

// LandingPage itself fetches nothing directly, but two of the sections it
// renders (Hero and WhyChooseUs) each call the shared useLandingStats() hook,
// which in turn calls getLandingStats() - confirmed by reading LandingPage.tsx,
// Hero.tsx, WhyChooseUs (inside LandingPage.tsx), and useLandingStats.ts.
// LandingPage also renders Navbar, which calls useAuth() - that requires an
// AuthProvider ancestor and AuthContext's checkAuth() reads getAuthToken()
// unconditionally on mount, so this suite renders with `withAuth: true` and the
// client mock below covers every export the mounted tree actually touches
// (confirmed by reading Navbar.tsx and AuthContext.tsx). No token is ever
// placed in localStorage, so checkAuth()'s `if (token)` branch is never
// entered and getCurrentUser() is never called.
vi.mock('../../../shared/api/client', () => ({
  getLandingStats: vi.fn(),
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getCurrentUser: vi.fn(),
}))

const mockedGetLandingStats = vi.mocked(getLandingStats)

const STUB_STATS = {
  active_projects: 1,
  contributors: 1,
  grants_distributed_usd: 1,
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hero and main sections, replacing the placeholder dashes with the real fetched stats', async () => {
    mockedGetLandingStats.mockResolvedValue({
      active_projects: 342,
      contributors: 15890,
      grants_distributed_usd: 1250000,
    })

    renderWithProviders(<LandingPage />, { withAuth: true })

    expect(screen.getByText(/Grainlify bridges the gap/i)).toBeInTheDocument()
    expect(screen.getByText('Built for a Multi-Chain Future')).toBeInTheDocument()
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Why Choose Grainlify?')).toBeInTheDocument()
    expect(screen.getByText('What Builders Say')).toBeInTheDocument()
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument()

    // Placeholder dashes render before the two independent useLandingStats()
    // fetches (one in Hero, one in WhyChooseUs) resolve.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('$1,250,000')).toBeInTheDocument()
    })
    // contributors and active_projects each render twice (Hero's stat grid and
    // WhyChooseUs's summary tiles); grants_distributed_usd only renders in Hero.
    expect(screen.getAllByText('342').length).toBeGreaterThan(0)
    expect(screen.getAllByText('15,890').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('—').length).toBe(0)
  })

  it('renders Get Started links that point to /signin', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)

    renderWithProviders(<LandingPage />, { withAuth: true })

    const links = screen.getAllByRole('link', { name: /get started/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/signin')
    })

    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
  })

  it('renders in both light and dark theme without crashing', async () => {
    mockedGetLandingStats.mockResolvedValue(STUB_STATS)

    const { unmount } = renderWithProviders(<LandingPage />, { theme: 'light', withAuth: true })
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
    unmount()

    renderWithProviders(<LandingPage />, { theme: 'dark', withAuth: true })
    expect(screen.getByText('Everything You Need to Succeed')).toBeInTheDocument()
    await waitFor(() => {
      expect(mockedGetLandingStats).toHaveBeenCalled()
    })
  })
})
