import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { GrainHackRulesPage } from './GrainHackRulesPage'

const mockGetGrainHackRules = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getGrainHackRules: (...args: unknown[]) => mockGetGrainHackRules(...args),
}))

const rules = (over: Record<string, unknown> = {}) => ({
  source: 'global_defaults',
  hackathon_id: null,
  hackathon_name: '',
  phase: '',
  rules: [
    { key: 'weight_fit_strong', value: '2.0', type: 'float', section: 'Draw weights',
      description: 'Ticket multiplier for a strong fit.', active: true },
    { key: 'min_account_age_days', value: '90', type: 'int', section: 'Hard gates',
      description: 'Minimum GitHub account age.', valid_range: '>= 0', active: true },
    { key: 'payout_floor', value: '50', type: 'money', section: 'Judging and payout',
      description: 'Minimum payout.', active: false },
  ],
  section_order: ['Hard gates', 'Draw weights', 'Judging and payout'],
  structural: {
    prior_completion_cap: 2,
    prior_completion_cap_note: 'The prior-completion weight compounds but stops at this many.',
  },
  ...over,
})

describe('GrainHackRulesPage', () => {
  beforeEach(() => vi.resetAllMocks())

  it('renders the values that are actually configured, grouped by section', async () => {
    mockGetGrainHackRules.mockResolvedValue(rules())
    renderWithProviders(<GrainHackRulesPage />)

    expect(await screen.findByText('Draw weights')).toBeInTheDocument()
    expect(screen.getByText('Hard gates')).toBeInTheDocument()
    expect(screen.getByText('Weight Fit Strong')).toBeInTheDocument()
    expect(screen.getByText('2.0')).toBeInTheDocument()
    expect(screen.getByText('90')).toBeInTheDocument()
  })

  it('publishes the structural clamp, which lives in code rather than config', async () => {
    mockGetGrainHackRules.mockResolvedValue(rules())
    renderWithProviders(<GrainHackRulesPage />)

    expect(await screen.findByText('Prior wins are capped at 2')).toBeInTheDocument()
    expect(
      screen.getByText('The prior-completion weight compounds but stops at this many.'),
    ).toBeInTheDocument()
  })

  it('marks a rule that has no consuming logic yet, so nobody plans around it', async () => {
    mockGetGrainHackRules.mockResolvedValue(rules())
    renderWithProviders(<GrainHackRulesPage />)

    expect(await screen.findByText('not in effect yet')).toBeInTheDocument()
  })

  it('says the rules are frozen once an event is live', async () => {
    mockGetGrainHackRules.mockResolvedValue(
      rules({ source: 'snapshot', hackathon_name: 'GrainHack Spring 2026', phase: 'live' }),
    )
    renderWithProviders(<GrainHackRulesPage hackathonId="hack-1" />)

    expect(await screen.findByText('GrainHack Spring 2026 rules')).toBeInTheDocument()
    expect(screen.getByText(/frozen when the event went live/)).toBeInTheDocument()
  })

  it('warns that rules can still change before an event starts', async () => {
    mockGetGrainHackRules.mockResolvedValue(rules({ source: 'not_yet_frozen', phase: 'issue_prep' }))
    renderWithProviders(<GrainHackRulesPage hackathonId="hack-1" />)

    expect(await screen.findByText(/can still change/)).toBeInTheDocument()
  })

  it('requests a specific event when given one', async () => {
    mockGetGrainHackRules.mockResolvedValue(rules())
    renderWithProviders(<GrainHackRulesPage hackathonId="hack-9" />)
    expect(mockGetGrainHackRules).toHaveBeenCalledWith('hack-9')
  })
})
