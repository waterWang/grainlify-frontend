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
// DataPage pulls in recharts and react-simple-maps, which are heavy and add
// nothing to a shell-navigation test.
vi.mock('./pages/DataPage', () => ({
  DataPage: () => <div data-testid="data-page" />,
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

/** The bootstrap prompt is no longer reachable from the ADMIN pill - that
 *  pill only exists for people who already hold the role. What survives is
 *  the fresh-install path: land on the admin tab as a non-admin and you get
 *  "Admin Access Required" with an Authenticate button. That is the only way
 *  a first admin can bootstrap through the UI. */
async function openAdminModal(user: ReturnType<typeof userEvent.setup>) {
  const authenticate = await screen.findByRole('button', { name: 'Authenticate' })
  await user.click(authenticate)
  expect(await screen.findByText('Admin Authentication')).toBeInTheDocument()
}

/** Renders straight onto the admin tab as a non-admin, which is the only
 *  remaining route to the bootstrap prompt. The URL has to be set before
 *  render because Dashboard resolves its tab in the state initialiser. */
function renderOnAdminTabAsNonAdmin() {
  window.history.pushState({}, '', '/dashboard?tab=admin')
  renderWithProviders(<Dashboard />)
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
      renderOnAdminTabAsNonAdmin()

      await openAdminModal(user)

      await user.type(screen.getByPlaceholderText('Enter admin password'), 'correct-password')
      await user.click(screen.getByRole('button', { name: 'Grant admin access' }))

      await waitFor(() => {
        expect(screen.queryByText('Admin Authentication')).not.toBeInTheDocument()
      })
      expect(vi.mocked(bootstrapAdmin)).toHaveBeenCalledWith('correct-password')
      expect(mockLogin).toHaveBeenCalledWith('test-admin-token')
      // What authentication does now is grant the role via login(), full stop.
      // It used to also set an `admin_authenticated` sessionStorage flag that
      // gated the Data page. That flag was removed: once the role switch
      // stopped opening this modal, nothing could set it, so Data rendered
      // nothing at all for a genuine admin. Admin surfaces gate on userRole.
      expect(sessionStorage.getItem('admin_authenticated')).toBeNull()
    })

    it('failed submit keeps the modal open, clears the password field, and leaves admin session inactive', async () => {
      const user = userEvent.setup()
      vi.mocked(bootstrapAdmin).mockRejectedValueOnce(new Error('Invalid bootstrap token'))
      renderOnAdminTabAsNonAdmin()

      await openAdminModal(user)

      const passwordInput = screen.getByPlaceholderText('Enter admin password') as HTMLInputElement
      await user.type(passwordInput, 'wrong-password')
      await user.click(screen.getByRole('button', { name: 'Grant admin access' }))

      await waitFor(() => {
        expect(vi.mocked(bootstrapAdmin)).toHaveBeenCalledWith('wrong-password')
      })
      // Modal stays open and the field is cleared for a retry.
      expect(screen.getByText('Admin Authentication')).toBeInTheDocument()
      await waitFor(() => {
        expect(passwordInput.value).toBe('')
      })
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('logout clears the auth session (regression: UserProfileDropdown must call the passed onLogout)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Dashboard />)

    await user.click(screen.getByTestId('logout-button'))

    expect(mockLogout).toHaveBeenCalledTimes(1)
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

    it('renders the Data page for an admin instead of an empty screen', async () => {
      // Regression. Data was gated on an `admin_authenticated` sessionStorage
      // flag, and when it was false the JSX rendered *nothing* - not a message,
      // not an error, just an empty content area. Since the role switch no
      // longer opens the modal that set the flag, every admin who clicked Data
      // got a blank page.
      mockUseAuth.mockReturnValue({
        userRole: 'admin',
        userId: 'admin-user-id',
        user: null,
        isAuthenticated: true,
        isLoading: false,
        login: mockLogin,
        logout: mockLogout,
      })
      window.history.pushState({}, '', '/dashboard?tab=data')

      const { container } = renderWithProviders(<Dashboard />)

      expect(await screen.findByTestId('data-page')).toBeInTheDocument()
      expect(container.textContent).not.toBe('')
    })

    it('explains itself on the Data page for a non-admin rather than rendering blank', async () => {
      window.history.pushState({}, '', '/dashboard?tab=data')

      renderWithProviders(<Dashboard />)

      expect(await screen.findByText('Admin Access Required')).toBeInTheDocument()
      expect(screen.queryByTestId('data-page')).not.toBeInTheDocument()
    })

    it('shows only admin surfaces in the sidebar while the ADMIN view is selected', async () => {
      // The rail used to render the same ten icons in every role, with Data
      // appended for admins - so switching role changed almost nothing about
      // what was on screen and the switch read as decorative.
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

      const railIds = () =>
        Array.from(container.querySelectorAll('nav [data-tour-id]')).map((el) =>
          el.getAttribute('data-tour-id'),
        )

      // Contributor view: the general surfaces are present.
      expect(railIds()).toEqual(expect.arrayContaining(['discover', 'browse', 'leaderboard', 'blog']))

      await user.click(screen.getByRole('button', { name: /ADMIN/i }))

      // Admin view: only the admin surfaces remain.
      await waitFor(() => {
        expect(railIds()).toEqual(['data', 'grainhack'])
      })
      for (const gone of ['discover', 'browse', 'ecosystems', 'leaderboard', 'blog', 'my-grainhack']) {
        expect(railIds()).not.toContain(gone)
      }
    })

    it('lands the ADMIN view on Data rather than the unimplemented admin placeholder', async () => {
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
      renderWithProviders(<Dashboard />)
      expect(await screen.findByTestId('discover-page')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /ADMIN/i }))

      // Previously navigated to "admin", whose page is a placeholder reading
      // "Content to be implemented" and which has no rail icon, so the sidebar
      // showed nothing selected.
      expect(await screen.findByTestId('data-page')).toBeInTheDocument()
    })

    it('blocks the grainhack page for a non-admin even when navigated to directly via ?tab= (the nav item alone is not the security boundary)', async () => {
      window.history.pushState({}, '', '/dashboard?tab=grainhack')

      renderWithProviders(<Dashboard />)

      expect(await screen.findByText('Admin Access Required')).toBeInTheDocument()
      expect(screen.queryByTestId('grainhack-page')).not.toBeInTheDocument()
    })
  })
})

describe('Dashboard admin pill visibility', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/dashboard')
    sessionStorage.clear()
    localStorage.clear()
  })

  it('hides the ADMIN pill from users without the role', async () => {
    mockUseAuth.mockReset().mockReturnValue({
      userRole: 'contributor',
      userId: 'user-1',
      user: { id: 'user-1' },
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
    })
    renderWithProviders(<Dashboard />)

    // Previously every user saw ADMIN, and clicking it prompted for the shared
    // bootstrap token - which promoted whoever typed it.
    await screen.findByRole('button', { name: 'CONTRIBUTOR' })
    expect(screen.queryByRole('button', { name: 'ADMIN' })).not.toBeInTheDocument()
  })

  it('shows the ADMIN pill to a real admin', async () => {
    mockUseAuth.mockReset().mockReturnValue({
      userRole: 'admin',
      userId: 'user-1',
      user: { id: 'user-1' },
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: mockLogout,
    })
    renderWithProviders(<Dashboard />)
    expect(await screen.findByRole('button', { name: 'ADMIN' })).toBeInTheDocument()
  })
})
