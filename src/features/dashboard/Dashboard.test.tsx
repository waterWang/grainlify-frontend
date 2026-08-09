import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { renderWithProviders } from '../../test/renderWithProviders'
import { Dashboard } from './Dashboard'
import { bootstrapAdmin } from '../../shared/api/client'

// Dashboard now syncs its URL via react-router's useSearchParams rather than
// raw window.history, so under the MemoryRouter renderWithProviders uses,
// window.location.search never changes (that's the whole point of
// MemoryRouter - it keeps navigation in-memory instead of touching the real
// browser URL). This spy renders the router's own idea of the current search
// string as text, which is what these tests assert against instead.
function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-spy">{location.search}</div>
}

// Dashboard is a shell component: it renders exactly one internal "page" based on
// a `currentPage` string state (synced to ?tab= in the URL and to
// localStorage['dashboardTab']), not via nested routes. These tests isolate the
// shell's own logic (nav, URL sync, keyboard shortcut, admin auth, logout) from
// its children's data-fetching by mocking the three child pages exercised below.
// Every other child page (ContributorsPage, LeaderboardPage, etc.) is never
// mounted by these tests, so it does not need mocking.
vi.mock('./pages/DiscoverPage', () => ({
  DiscoverPage: () => <div data-testid="discover-page" />,
}))
vi.mock('./pages/BrowsePage', () => ({
  BrowsePage: () => <div data-testid="browse-page" />,
}))
vi.mock('./pages/SearchPage', () => ({
  SearchPage: () => <div data-testid="search-page" />,
}))
vi.mock('../grainhack/pages/GrainHackAdminPage', () => ({
  GrainHackAdminPage: () => <div data-testid="grainhack-page" />,
}))

// UserProfileDropdown pulls in Radix DropdownMenu internals that add nothing to a
// Dashboard-shell test beyond opening/closing chrome. Replace it with a minimal
// stub that wires the real `onLogout` prop straight to a button, which is exactly
// the wiring this suite's logout regression test needs to prove.
vi.mock('../../shared/components/UserProfileDropdown', () => ({
  UserProfileDropdown: ({ onLogout }: { onLogout?: () => void }) => (
    <button type="button" data-testid="logout-button" onClick={onLogout}>
      Mock Logout
    </button>
  ),
}))

// Dashboard imports many lucide-react icons directly (and so do RoleSwitcher,
// NotificationsDropdown, and the shared Modal it renders for admin auth). Replace
// every real export with a tiny stand-in that tags itself (data-icon="<Name>"),
// which lets nav buttons be located reliably without depending on hover-only
// tooltip text. Built from the real module's own export names (via
// importOriginal) rather than a Proxy — Vitest's ESM interop needs named exports
// to actually be present on the mock, which a bare `get`-trap Proxy doesn't satisfy.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const mocked: Record<string, unknown> = {}
  for (const iconName of Object.keys(actual)) {
    mocked[iconName] = (props: Record<string, unknown>) => (
      <svg data-icon={iconName} {...props} />
    )
  }
  return mocked
})

vi.mock('../../shared/api/client', () => ({
  bootstrapAdmin: vi.fn(),
}))

// The admin-activation flow below renders the real AdminPage, which in turn
// renders these two - unrelated to what this suite tests (shell nav/auth),
// and covered by their own SocialFollowReview.test.tsx / RedemptionsReview.test.tsx.
vi.mock('../admin/components/SocialFollowReview', () => ({
  SocialFollowReview: () => null,
}))
vi.mock('../admin/components/RedemptionsReview', () => ({
  RedemptionsReview: () => null,
}))

// useAuth is a hoisted vi.fn() (not a fixed literal) so individual tests -
// namely the GrainHack admin-gating ones below - can override userRole for a
// single render via mockReturnValueOnce without disturbing every other test
// in this file, which all rely on the plain-contributor default set below.
const { mockLogin, mockLogout, mockUseAuth } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockLogout: vi.fn(),
  mockUseAuth: vi.fn(),
}))

vi.mock('../../shared/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: mockUseAuth,
}))

async function openAdminModal(user: ReturnType<typeof userEvent.setup>) {
  const adminButton = screen.getByRole('button', { name: 'ADMIN' })
  await user.click(adminButton)
  expect(await screen.findByText('Admin Authentication')).toBeInTheDocument()
}

describe('Dashboard', () => {
  beforeEach(() => {
    // Dashboard reads window.location.search (not react-router's location) for its
    // initial tab, and reads/writes sessionStorage for admin auth — both persist
    // across tests within a file (jsdom is shared per test file), so reset them.
    window.history.pushState({}, '', '/dashboard')
    sessionStorage.clear()
    mockUseAuth.mockReset().mockReturnValue({
      userRole: null,
      userId: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
    })
  })

  it('renders the dashboard shell with Discover active by default', async () => {
    const { container } = renderWithProviders(<Dashboard />)

    // Page content (DiscoverPage) is lazy-loaded (see Dashboard.tsx), so it
    // resolves behind a Suspense fallback rather than rendering synchronously.
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()
    // Sidebar nav icon rail rendered for the default (contributor) role.
    expect(container.querySelector('[data-icon="Compass"]')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="Grid3x3"]')).toBeInTheDocument()
    expect(container.querySelector('[data-icon="Trophy"]')).toBeInTheDocument()
    // Top bar search pill.
    expect(screen.getByText('Search projects, issues, contributors...')).toBeInTheDocument()
  })

  it('renders the Browse page when the initial URL has ?tab=browse', async () => {
    window.history.pushState({}, '', '/dashboard?tab=browse')

    renderWithProviders(<Dashboard />)

    expect(await screen.findByTestId('browse-page')).toBeInTheDocument()
    expect(screen.queryByTestId('discover-page')).not.toBeInTheDocument()
  })

  it('clicking a nav item switches the active page and syncs ?tab= in the URL and localStorage', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <>
        <Dashboard />
        <LocationSpy />
      </>,
    )
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    const browseNavButton = container.querySelector('[data-icon="Grid3x3"]')?.closest('button')
    expect(browseNavButton).toBeTruthy()

    await user.click(browseNavButton as HTMLButtonElement)

    expect(await screen.findByTestId('browse-page')).toBeInTheDocument()
    expect(screen.queryByTestId('discover-page')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('location-spy').textContent).toContain('tab=browse')
    })
    expect(localStorage.getItem('dashboardTab')).toBe('browse')
  })

  it('opens Search on Cmd+K', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(await screen.findByTestId('search-page')).toBeInTheDocument()
  })

  it('opens Search on Ctrl+K', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(await screen.findByTestId('search-page')).toBeInTheDocument()
  })

  describe('admin authentication modal', () => {
    it('successful submit closes the modal, activates the admin session, and logs in', async () => {
      const user = userEvent.setup()
      vi.mocked(bootstrapAdmin).mockResolvedValueOnce({
        ok: true,
        token: 'test-admin-token',
        role: 'admin',
      })
      renderWithProviders(<Dashboard />)

      await openAdminModal(user)

      await user.type(screen.getByPlaceholderText('Enter admin password'), 'correct-password')
      await user.click(screen.getByRole('button', { name: 'Authenticate' }))

      await waitFor(() => {
        expect(screen.queryByText('Admin Authentication')).not.toBeInTheDocument()
      })
      expect(vi.mocked(bootstrapAdmin)).toHaveBeenCalledWith('correct-password')
      expect(mockLogin).toHaveBeenCalledWith('test-admin-token')
      expect(sessionStorage.getItem('admin_authenticated')).toBe('true')
    })

    it('failed submit keeps the modal open, clears the password field, and leaves admin session inactive', async () => {
      const user = userEvent.setup()
      vi.mocked(bootstrapAdmin).mockRejectedValueOnce(new Error('Invalid bootstrap token'))
      renderWithProviders(<Dashboard />)

      await openAdminModal(user)

      const passwordInput = screen.getByPlaceholderText('Enter admin password') as HTMLInputElement
      await user.type(passwordInput, 'wrong-password')
      await user.click(screen.getByRole('button', { name: 'Authenticate' }))

      await waitFor(() => {
        expect(vi.mocked(bootstrapAdmin)).toHaveBeenCalledWith('wrong-password')
      })
      // Modal stays open and the field is cleared for a retry.
      expect(screen.getByText('Admin Authentication')).toBeInTheDocument()
      await waitFor(() => {
        expect(passwordInput.value).toBe('')
      })
      expect(sessionStorage.getItem('admin_authenticated')).not.toBe('true')
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('logout clears both the auth session and the admin session flag (regression: UserProfileDropdown must call the passed onLogout)', async () => {
    sessionStorage.setItem('admin_authenticated', 'true')
    const user = userEvent.setup()
    renderWithProviders(<Dashboard />)

    await user.click(screen.getByTestId('logout-button'))

    expect(mockLogout).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('admin_authenticated')).toBeNull()
  })

  describe('GrainHack admin gating (real userRole, not the activeRole view-switcher)', () => {
    it('hides the GrainHack nav item for a non-admin', async () => {
      const { container } = renderWithProviders(<Dashboard />)
      expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

      expect(container.querySelector('[data-icon="Flag"]')).not.toBeInTheDocument()
    })

    it('shows the GrainHack nav item for userRole admin and navigates to it on click', async () => {
      mockUseAuth.mockReturnValue({
        userRole: 'admin',
        userId: 'admin-user-id',
        user: null,
        isAuthenticated: true,
        isLoading: false,
        login: mockLogin,
        logout: mockLogout,
      })
      const user = userEvent.setup()
      const { container } = renderWithProviders(<Dashboard />)
      expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

      const grainhackNavButton = container.querySelector('[data-icon="Flag"]')?.closest('button')
      expect(grainhackNavButton).toBeTruthy()

      await user.click(grainhackNavButton as HTMLButtonElement)

      expect(await screen.findByTestId('grainhack-page')).toBeInTheDocument()
    })

    it('blocks the grainhack page for a non-admin even when navigated to directly via ?tab= (the nav item alone is not the security boundary)', async () => {
      window.history.pushState({}, '', '/dashboard?tab=grainhack')

      renderWithProviders(<Dashboard />)

      expect(await screen.findByText('Admin Access Required')).toBeInTheDocument()
      expect(screen.queryByTestId('grainhack-page')).not.toBeInTheDocument()
    })
  })
})
