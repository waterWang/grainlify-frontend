import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../../test/renderWithProviders'
import { BillingProfilesProvider } from '../../contexts/BillingProfilesContext'
import { BillingTab } from './BillingTab'
import type { BillingProfile } from '../../types'
// The real class, from its own module — the client module is mocked below, so
// anything imported from there would be undefined here.
import { ApiError } from '../../../../shared/api/apiError'

const mockStartKYCVerification = vi.fn()
const mockGetKYCStatus = vi.fn()
vi.mock('../../../../shared/api/client', () => ({
  startKYCVerification: (...args: unknown[]) => mockStartKYCVerification(...args),
  getKYCStatus: (...args: unknown[]) => mockGetKYCStatus(...args),
}))

// Union of every icon imported anywhere in BillingTab's static import graph
// (BillingTab itself, plus BillingProfileCard/PaymentMethodsTab/InvoicesTab,
// which are imported unconditionally even though only one detail sub-tab
// renders at a time).
vi.mock('lucide-react', () => ({
  Plus: () => null,
  X: () => null,
  Loader2: () => null,
  AlertCircle: () => null,
  Info: () => null,
  ChevronDown: () => null,
  MessageSquare: () => null,
  Circle: () => null,
  CircleX: () => null,
  Trash2: () => null,
  Wallet: () => null,
  Copy: () => null,
  CheckCircle2: () => null,
  Star: () => null,
  Download: () => null,
  FileText: () => null,
  Clock: () => null,
}))

function seedProfiles(profiles: Partial<BillingProfile>[]) {
  localStorage.setItem('billing_profiles', JSON.stringify(profiles))
}

function renderBillingTab(options?: Parameters<typeof renderWithProviders>[1]) {
  return renderWithProviders(
    <BillingProfilesProvider>
      <BillingTab />
    </BillingProfilesProvider>,
    options
  )
}

describe('BillingTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    // window.open / window.setInterval are stubbed via vi.spyOn in the KYC
    // tests below; restore the real implementations so later tests/files
    // aren't affected (vi.resetAllMocks alone would leave the spy attached).
    vi.restoreAllMocks()
  })

  it('renders an empty (mock/local) billing profiles list without crashing', async () => {
    renderBillingTab()
    expect(await screen.findByText('Billing Profiles')).toBeInTheDocument()
    expect(screen.getByText('No billing profiles yet')).toBeInTheDocument()
  })

  it('renders billing profiles seeded from the local BillingProfilesContext', async () => {
    seedProfiles([
      { id: 1, name: 'My Verified Profile', type: 'individual', status: 'verified' },
    ])
    renderBillingTab()

    expect(await screen.findByText('My Verified Profile')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('creating a new profile via the modal adds it to the local list', async () => {
    const user = userEvent.setup()
    renderBillingTab()

    await user.click(await screen.findByRole('button', { name: /New Profile/ }))
    const nameInput = await screen.findByPlaceholderText('Enter profile name')
    await user.type(nameInput, 'Freelance Profile')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Freelance Profile')).toBeInTheDocument()
    expect(screen.getByText('Missing Verification')).toBeInTheDocument()
  })

  it('starting KYC verification successfully does not show the start-verification error (regression: kycWindow bug)', async () => {
    seedProfiles([{ id: 1, name: 'Test Profile', type: 'individual', status: 'missing-verification' }])
    mockGetKYCStatus.mockResolvedValue({ status: null })
    mockStartKYCVerification.mockResolvedValue({ session_id: 's1', url: 'https://kyc.example/verify' })

    const fakeWindow = {} as Window
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow)
    // Prevent the real 3s poll from actually scheduling while still letting
    // us assert it was registered with the right delay.
    const setIntervalSpy = vi
      .spyOn(window, 'setInterval')
      .mockImplementation(() => 0 as unknown as ReturnType<typeof window.setInterval>)

    const user = userEvent.setup()
    renderBillingTab()

    await user.click(await screen.findByText('Test Profile'))
    await waitFor(() => expect(mockGetKYCStatus).toHaveBeenCalledTimes(1))

    const verifyButton = await screen.findByRole('button', { name: 'Verify KYC' })
    await user.click(verifyButton)

    await waitFor(() => expect(mockStartKYCVerification).toHaveBeenCalledTimes(1))
    expect(openSpy).toHaveBeenCalledWith('https://kyc.example/verify', '_blank', 'width=800,height=600')

    // The immediate post-open status check (distinct from the interval poll).
    await waitFor(() => expect(mockGetKYCStatus).toHaveBeenCalledTimes(2))
    // Polling for status begins: setInterval registered at the documented 3s cadence.
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 3000)

    expect(
      screen.queryByText('Could not start verification. Please try again later.')
    ).not.toBeInTheDocument()
  })

  it('offers to resume, not an error, when a verification session already exists', async () => {
    // Regression, reported from production. The backend answers 409 with the
    // URL of the session the user already has; apiRequest used to flatten the
    // response to its message and drop that URL, so the UI said "try again
    // later" — the one thing that could never work — while holding the way
    // back in a discarded field.
    seedProfiles([{ id: 1, name: 'Test Profile', type: 'individual', status: 'missing-verification' }])
    mockGetKYCStatus.mockResolvedValue({ status: null })
    const conflict = new ApiError(
      'You already have an active KYC verification session (status: pending).',
      409,
      { error: 'kyc_session_exists', status: 'pending', url: 'https://verify.didit.me/session/abc123' },
    )
    mockStartKYCVerification.mockRejectedValueOnce(conflict)

    const user = userEvent.setup()
    renderBillingTab()

    await user.click(await screen.findByText('Test Profile'))
    await waitFor(() => expect(mockGetKYCStatus).toHaveBeenCalledTimes(1))
    await user.click(await screen.findByRole('button', { name: 'Verify KYC' }))

    expect(await screen.findByRole('button', { name: 'Continue verification' })).toBeInTheDocument()
    expect(
      screen.queryByText('Could not start verification. Please try again later.'),
    ).not.toBeInTheDocument()
  })

  it('shows an error message (and does not hang) when starting KYC verification fails', async () => {
    seedProfiles([{ id: 1, name: 'Test Profile', type: 'individual', status: 'missing-verification' }])
    mockGetKYCStatus.mockResolvedValue({ status: null })
    mockStartKYCVerification.mockRejectedValueOnce(new Error('network error'))

    const user = userEvent.setup()
    renderBillingTab()

    await user.click(await screen.findByText('Test Profile'))
    await waitFor(() => expect(mockGetKYCStatus).toHaveBeenCalledTimes(1))

    const verifyButton = await screen.findByRole('button', { name: 'Verify KYC' })
    await user.click(verifyButton)

    expect(
      await screen.findByText('Could not start verification. Please try again later.')
    ).toBeInTheDocument()
    // Doesn't get stuck in a spinner/disabled state - the button recovers.
    expect(await screen.findByRole('button', { name: 'Verify KYC' })).toBeEnabled()
  })
})
