import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { RedeemPage } from './RedeemPage'

const mockGetPointsBalance = vi.fn()
const mockGetMyRedemptions = vi.fn()
const mockCreateRedemption = vi.fn()

vi.mock('../../../shared/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../shared/api/client')>('../../../shared/api/client')
  return {
    ...actual,
    getPointsBalance: (...args: unknown[]) => mockGetPointsBalance(...args),
    getMyRedemptions: (...args: unknown[]) => mockGetMyRedemptions(...args),
    createRedemption: (...args: unknown[]) => mockCreateRedemption(...args),
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const BASE_BALANCE = { balance: 600, usdc_per_point: 0.01, min_redemption_points: 100 }
// A real, well-formed Stellar Ed25519 public key shape (G + 55 base32 chars)
// so the client-side format check passes without needing real strkey checksum
// validation, which only the backend performs.
const VALID_WALLET = 'G' + 'A'.repeat(55)


describe('RedeemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPointsBalance.mockResolvedValue(BASE_BALANCE)
    mockGetMyRedemptions.mockResolvedValue({ redemptions: [] })
    mockCreateRedemption.mockResolvedValue({ id: 'redemption-1', usdc_amount: 3 })
  })

  it('loads and displays the current balance', async () => {
    renderWithProviders(<RedeemPage />)
    expect(await screen.findByText('600', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows the USDC equivalent updating live as points are entered', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await user.type(screen.getByLabelText('Points to redeem'), '250')

    expect(await screen.findByText('2.50')).toBeInTheDocument()
  })

  it('only accepts digits in the points field', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    const input = await screen.findByLabelText('Points to redeem')

    await user.type(input, '12a3b')

    expect(input).toHaveValue('123')
  })

  it('Max fills the input with the full balance', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    await screen.findByLabelText('Points to redeem')

    await user.click(screen.getByRole('button', { name: 'Max' }))

    expect(screen.getByLabelText('Points to redeem')).toHaveValue('600')
  })

  it('closes redemptions: the CTA is disabled whatever is typed, and nothing is submitted', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RedeemPage />)
    const pointsInput = await screen.findByLabelText('Points to redeem')
    const walletInput = screen.getByLabelText('Stellar wallet address')

    // The points programme is retired and the API refuses new requests, so
    // the page must never offer an action that cannot succeed - not even
    // once every field is filled in perfectly.
    const closed = () => screen.getByRole('button', { name: 'Redemptions are closed' })
    expect(closed()).toBeDisabled()

    await user.type(pointsInput, '300')
    await user.type(walletInput, VALID_WALLET)
    expect(closed()).toBeDisabled()

    await user.click(closed())
    expect(mockCreateRedemption).not.toHaveBeenCalled()
  })

  it('explains where rewards went rather than leaving the balance unexplained', async () => {
    renderWithProviders(<RedeemPage />)

    expect(await screen.findByText(/Founding Contributor Pool/)).toBeInTheDocument()
    // The reassurance matters as much as the notice: a balance that simply
    // stops working reads as something being taken away.
    expect(screen.getByText(/nothing has been taken from anyone/i)).toBeInTheDocument()
    // No conversion rate is advertised for a conversion that cannot happen.
    expect(screen.queryByText(/100 points = \$1\.00 USDC/)).not.toBeInTheDocument()
  })

  it('renders redemption history with the right status badge per entry', async () => {
    mockGetMyRedemptions.mockResolvedValue({
      redemptions: [
        { id: 'r1', points_spent: 100, usdc_amount: '1.00', stellar_wallet_address: VALID_WALLET, status: 'paid', created_at: '2026-01-01T00:00:00Z' },
        { id: 'r2', points_spent: 200, usdc_amount: '2.00', stellar_wallet_address: VALID_WALLET, status: 'pending', created_at: '2026-01-02T00:00:00Z' },
        { id: 'r3', points_spent: 150, usdc_amount: '1.50', stellar_wallet_address: VALID_WALLET, status: 'rejected', created_at: '2026-01-03T00:00:00Z' },
      ],
    })
    renderWithProviders(<RedeemPage />)

    expect(await screen.findByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText(/100 pts → \$1\.00 USDC/)).toBeInTheDocument()
  })

})
