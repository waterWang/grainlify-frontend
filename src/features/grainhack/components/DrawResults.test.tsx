import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { DrawResults } from './DrawResults'

const mockGetHackathonDraws = vi.fn()
const mockSimulateHackathonDraw = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonDraws: (...args: unknown[]) => mockGetHackathonDraws(...args),
  simulateHackathonDraw: (...args: unknown[]) => mockSimulateHackathonDraw(...args),
}))

const POOL = [
  {
    user_id: 'u-1',
    github_login: 'winner',
    fit: 'strong',
    is_newcomer: true,
    weights: { fit_strong: 2, first_ever_application: 1.5 },
    tickets: 3,
  },
  {
    user_id: 'u-2',
    github_login: 'runner-up',
    fit: 'plausible',
    is_newcomer: false,
    weights: { fit_plausible: 1 },
    tickets: 1,
  },
]

const DRAW = {
  id: 'draw-1',
  hackathon_issue_id: 'hi-1',
  repo_full_name: 'acme/widgets',
  issue_number: 42,
  seed: 12345,
  pool: POOL,
  pool_size: 2,
  winner_user_id: 'u-1',
  winner_login: 'winner',
  used_weak_pool: false,
  reservation_applied: false,
  reservation_fell_back: false,
  first_come_fallback: false,
  no_winner_reason: null,
  is_simulation: false,
  created_at: new Date().toISOString(),
}

describe('DrawResults', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetHackathonDraws.mockResolvedValue({ draws: [DRAW] })
  })

  it('excludes simulations by default, and includes them when asked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DrawResults hackathonId="hack-1" />)

    await waitFor(() =>
      expect(mockGetHackathonDraws).toHaveBeenCalledWith('hack-1', { include_simulations: false }),
    )

    await user.click(screen.getByRole('checkbox'))
    await waitFor(() =>
      expect(mockGetHackathonDraws).toHaveBeenCalledWith('hack-1', { include_simulations: true }),
    )
  })

  it('summarises each draw with its winner, pool size and seed', async () => {
    renderWithProviders(<DrawResults hackathonId="hack-1" />)

    expect(await screen.findByText('acme/widgets#42')).toBeInTheDocument()
    expect(screen.getByText(/winner won/)).toBeInTheDocument()
    expect(screen.getByText(/2 in pool/)).toBeInTheDocument()
    // The seed is what makes the draw replayable during an appeal.
    expect(screen.getByText(/seed 12345/)).toBeInTheDocument()
  })

  it('expanding a draw reveals the full ticket breakdown', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DrawResults hackathonId="hack-1" />)
    await screen.findByText('acme/widgets#42')

    expect(screen.queryByText(/First-ever application/)).not.toBeInTheDocument()

    await user.click(screen.getByText('acme/widgets#42'))

    expect(await screen.findByText(/First-ever application ×1.5/)).toBeInTheDocument()
    expect(screen.getByText('Won')).toBeInTheDocument()
  })

  it('surfaces why a draw produced no winner', async () => {
    mockGetHackathonDraws.mockResolvedValue({
      draws: [
        {
          ...DRAW,
          winner_user_id: null,
          winner_login: null,
          no_winner_reason: "winner's slot was consumed by an earlier draw in this batch",
        },
      ],
    })
    renderWithProviders(<DrawResults hackathonId="hack-1" />)

    expect(
      await screen.findByText(/winner's slot was consumed by an earlier draw in this batch/),
    ).toBeInTheDocument()
  })

  it('flags the fallbacks that fired, so an odd result is explainable', async () => {
    mockGetHackathonDraws.mockResolvedValue({
      draws: [{ ...DRAW, used_weak_pool: true, reservation_applied: true, reservation_fell_back: true }],
    })
    renderWithProviders(<DrawResults hackathonId="hack-1" />)

    expect(await screen.findByText('weak pool')).toBeInTheDocument()
    expect(screen.getByText('newcomer-reserved')).toBeInTheDocument()
    expect(screen.getByText('reservation fell back')).toBeInTheDocument()
  })

  it('re-simulating replays with the stored seed and shows the resulting pool', async () => {
    mockSimulateHackathonDraw.mockResolvedValue({
      draw_id: 'sim-1',
      hackathon_issue_id: 'hi-1',
      seed: 12345,
      pool: POOL,
      winner_user_id: 'u-1',
      winner_login: 'winner',
      used_weak_pool: false,
      reservation_applied: false,
      reservation_fell_back: false,
      first_come_fallback: false,
      is_simulation: true,
    })
    const user = userEvent.setup()

    renderWithProviders(<DrawResults hackathonId="hack-1" />)
    await screen.findByText('acme/widgets#42')

    const buttons = screen.getAllByRole('button')
    const refresh = buttons.find((b) => b.getAttribute('title')?.includes('Re-run this draw'))
    expect(refresh).toBeTruthy()
    await user.click(refresh as HTMLElement)

    await waitFor(() => expect(mockSimulateHackathonDraw).toHaveBeenCalledWith('hi-1', 12345))
    expect(await screen.findByText(/Simulation · seed 12345/)).toBeInTheDocument()
  })

  it('shows an empty state explaining when draws happen', async () => {
    mockGetHackathonDraws.mockResolvedValue({ draws: [] })
    renderWithProviders(<DrawResults hackathonId="hack-1" />)

    expect(
      await screen.findByText(/They run automatically when an issue's application window closes/),
    ).toBeInTheDocument()
  })
})
