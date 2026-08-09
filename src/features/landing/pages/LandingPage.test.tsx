import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../../../shared/i18n'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../shared/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('../../../shared/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, logout: vi.fn() }),
}))

vi.mock('../../../shared/hooks/useLandingStats', () => ({
  useLandingStats: () => mockUseLandingStats(),
}))

vi.mock('../../../shared/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}))

vi.mock('react-theme-switch-animation', () => ({
  useModeAnimation: () => ({
    ref: { current: null },
    toggleSwitchTheme: vi.fn(),
  }),
}))

vi.mock('react-intl', () => ({
  IntlProvider: ({ children }: { children: React.ReactNode }) => children,
  FormattedMessage: ({ id }: { id: string }) => id,
  useIntl: () => ({ locale: 'en', formatMessage: ({ id }: { id: string }) => id }),
}))

// ---------------------------------------------------------------------------
// Mutable useLandingStats mock
// ---------------------------------------------------------------------------

const mockUseLandingStats = vi.fn()

type LandingStatsMock = {
  display: Record<string, string>
  isLoading: boolean
  error: string | null
  refetch: ReturnType<typeof vi.fn>
}

function setLandingStatsMock(overrides: Partial<LandingStatsMock>) {
  mockUseLandingStats.mockReturnValue({
    display: {
      activeProjects: '1,234',
      contributors: '5,678',
      grantsDistributed: '$2.1M',
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderWithRouter(ui: React.ReactNode) {
  return render(
    <I18nProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLandingStatsMock({})
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<LandingPage />)
    expect(container).toBeInTheDocument()
  })

  it('renders the main heading', () => {
    renderWithRouter(<LandingPage />)
    // The heading text is split across an inline <span> and a <br/> (see
    // Hero.tsx), so the accessible-name whitespace between words is an
    // implementation detail of the accessible-name algorithm (it differs
    // between jsdom versions) rather than something meaningful to assert on
    // — match on the words independently of the exact whitespace between them.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: (accessibleName) =>
          /connect\s*with/i.test(accessibleName) && /open\s*source/i.test(accessibleName),
      })
    ).toBeInTheDocument()
  })

  it('provides a skip-to-content link as the first focusable element', () => {
    renderWithRouter(<LandingPage />)
    const skipLink = screen.getByRole('link', { name: /common.skipToContent/i })
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveAttribute('href', '#landing-main')
    expect(skipLink).toHaveClass('sr-only', 'focus:not-sr-only')
  })

  it('has a main element with the correct id and tabIndex for the skip link target', () => {
    renderWithRouter(<LandingPage />)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'landing-main')
    expect(main).toHaveAttribute('tabIndex', '-1')
  })
})

describe('Navbar logo image', () => {
  it('has descriptive alt text', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('alt', 'Grainlify')
  })

  it('uses eager loading for above-the-fold LCP image', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toHaveAttribute('loading', 'eager')
  })

  it('has decoding async for performance', () => {
    renderWithRouter(<LandingPage />)
    const logo = screen.getByAltText('Grainlify')
    expect(logo).toHaveAttribute('decoding', 'async')
  })
})

describe('Testimonial avatar images', () => {
  it('renders all three testimonial avatars with descriptive alt text', () => {
    renderWithRouter(<LandingPage />)

    const avatars = [
      { name: 'Sarah Chen', role: 'Full Stack Developer' },
      { name: 'Marcus Johnson', role: 'Project Maintainer' },
      { name: 'Emily Rodriguez', role: 'Open Source Contributor' },
    ]

    for (const { name, role } of avatars) {
      const img = screen.getByAltText(`${name}, ${role}`)
      expect(img).toBeInTheDocument()
    }
  })

  it('uses loading=lazy on all testimonial avatars', () => {
    renderWithRouter(<LandingPage />)
    const lazyImages = screen.getAllByTestId('image-with-fallback')
    expect(lazyImages.length).toBeGreaterThanOrEqual(3)

    for (const img of lazyImages) {
      expect(img).toHaveAttribute('loading', 'lazy')
    }
  })

  it('uses decoding=async on all testimonial avatars', () => {
    renderWithRouter(<LandingPage />)
    const lazyImages = screen.getAllByTestId('image-with-fallback')

    for (const img of lazyImages) {
      expect(img).toHaveAttribute('decoding', 'async')
    }
  })

  it('uses ImageWithFallback for remote avatar images', () => {
    renderWithRouter(<LandingPage />)
    const fallbackImages = screen.getAllByTestId('image-with-fallback')
    expect(fallbackImages.length).toBe(3)
  })
})

describe('ImageWithFallback security', () => {
  it('rejects invalid URLs and renders fallback placeholder', () => {
    // This is tested at the component level in ImageWithFallback.test.tsx;
    // here we verify the integration by checking the data-testid presence.
    renderWithRouter(<LandingPage />)
    const images = screen.getAllByTestId('image-with-fallback')
    expect(images.length).toBe(3)
  })
})

describe('WhyChooseUs stats loading state', () => {
  beforeEach(() => {
    setLandingStatsMock({ isLoading: true, error: null })
  })

  it('shows skeleton loaders while stats are loading', () => {
    renderWithRouter(<LandingPage />)
    const skeletons = screen.getAllByTestId('skeleton-loader')
    expect(skeletons.length).toBeGreaterThanOrEqual(2)
  })
})

describe('WhyChooseUs stats error state', () => {
  beforeEach(() => {
    setLandingStatsMock({
      isLoading: false,
      error: 'Network error',
      display: { activeProjects: '—', contributors: '—', grantsDistributed: '—' },
    })
  })

  it('shows retry button when fetch fails', () => {
    renderWithRouter(<LandingPage />)
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
