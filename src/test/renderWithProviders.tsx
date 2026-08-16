import type { ReactElement, ReactNode } from 'react'
import { SupportContext } from '../shared/components/supportContext'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../shared/contexts/ThemeContext'
import { AuthProvider } from '../shared/contexts/AuthContext'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark'
  route?: string
  /**
   * AuthProvider fires a real getCurrentUser() API call on mount, so it's
   * opt-in rather than always wrapped — tests unrelated to auth shouldn't be
   * forced to mock the API client just to render.
   */
  withAuth?: boolean
}

export function renderWithProviders(
  ui: ReactElement,
  { theme = 'light', route = '/', withAuth = false, ...options }: RenderWithProvidersOptions = {}
) {
  localStorage.setItem('theme', theme)

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const body = withAuth ? <AuthProvider>{children}</AuthProvider> : <>{children}</>
    return (
      <MemoryRouter initialEntries={[route]}>
        {/* The support trigger now lives in the sidebar rail and the
            public-route chrome, so most components under test render one, and
            useSupport throws outside a provider by design. The context is
            supplied directly rather than by mounting the real SupportProvider:
            a unit test does not need the panel, and importing it would pull
            its icons into the eight test files that replace lucide-react
            wholesale. Opening the panel is covered by SupportWidget.test.tsx
            and the e2e suite. */}
        <ThemeProvider>
          <SupportContext.Provider value={{ open: () => {} }}>{body}</SupportContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

export * from '@testing-library/react'
