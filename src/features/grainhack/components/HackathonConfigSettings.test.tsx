import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { HackathonConfigSettings } from './HackathonConfigSettings'

const mockGetHackathonConfigSettings = vi.fn()
const mockUpdateHackathonConfigSetting = vi.fn()
const mockResetHackathonConfigSetting = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonConfigSettings: (...args: unknown[]) => mockGetHackathonConfigSettings(...args),
  updateHackathonConfigSetting: (...args: unknown[]) => mockUpdateHackathonConfigSetting(...args),
  resetHackathonConfigSetting: (...args: unknown[]) => mockResetHackathonConfigSetting(...args),
}))

const BASE_SETTINGS = [
  {
    key: 'max_issues_per_org',
    type: 'int',
    section: 'Issue intake',
    description: 'Maximum published issues per organization.',
    valid_range: '1-500',
    active: true,
    default: '50',
    value: '50',
    overridden: false,
  },
  {
    key: 'require_acceptance_criteria',
    type: 'bool',
    section: 'Issue intake',
    description: 'Require acceptance criteria before publishing.',
    active: true,
    default: 'true',
    value: 'true',
    overridden: false,
  },
  {
    key: 'merge_grace_period_hours',
    type: 'int',
    section: 'Hard gates',
    description: 'Hours after event end a PR may still merge.',
    active: true,
    default: '48',
    value: '48',
    overridden: false,
  },
]

describe('HackathonConfigSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetHackathonConfigSettings.mockResolvedValue({ settings: BASE_SETTINGS })
    mockUpdateHackathonConfigSetting.mockResolvedValue({ ok: true })
    mockResetHackathonConfigSetting.mockResolvedValue({ ok: true })
  })

  it('loads settings grouped into their sections, for the requested scope', async () => {
    renderWithProviders(<HackathonConfigSettings hackathonId="hack-1" />)

    await waitFor(() => expect(mockGetHackathonConfigSettings).toHaveBeenCalledWith('hack-1'))
    expect(await screen.findByText('Issue intake')).toBeInTheDocument()
    expect(screen.getByText('Hard gates')).toBeInTheDocument()
    expect(screen.getByText('Max Issues Per Org')).toBeInTheDocument()
  })

  it('fetches global defaults (no hackathon id) when hackathonId is omitted', async () => {
    renderWithProviders(<HackathonConfigSettings />);
    await waitFor(() => expect(mockGetHackathonConfigSettings).toHaveBeenCalledWith(undefined))
  })

  it('save is disabled until a value changes, then saves only the changed key', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HackathonConfigSettings hackathonId="hack-1" />)
    await screen.findByText('Issue intake')

    const saveButton = screen.getByRole('button', { name: 'Save changes' })
    expect(saveButton).toBeDisabled()

    const maxIssuesInput = screen.getByDisplayValue('50')
    await user.clear(maxIssuesInput)
    await user.type(maxIssuesInput, '75')
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    await waitFor(() =>
      expect(mockUpdateHackathonConfigSetting).toHaveBeenCalledWith({
        hackathon_id: 'hack-1',
        key: 'max_issues_per_org',
        value: '75',
      }),
    )
    // The two untouched settings (require_acceptance_criteria, merge_grace_period_hours=48)
    // must not be written - only genuinely changed keys are sent.
    expect(mockUpdateHackathonConfigSetting).toHaveBeenCalledTimes(1)
  })

  it('sends hackathon_id: null when saving a global-default change', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HackathonConfigSettings />)
    await screen.findByText('Issue intake')

    const maxIssuesInput = screen.getByDisplayValue('50')
    await user.clear(maxIssuesInput)
    await user.type(maxIssuesInput, '10')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mockUpdateHackathonConfigSetting).toHaveBeenCalledWith({
        hackathon_id: null,
        key: 'max_issues_per_org',
        value: '10',
      }),
    )
  })

  it('shows no reset buttons in the global-defaults view (nothing to fall back to)', async () => {
    renderWithProviders(<HackathonConfigSettings />)
    await screen.findByText('Issue intake')

    expect(screen.queryByTitle('Reset to default')).not.toBeInTheDocument()
  })

  it('shows a reset button only for overridden settings in a per-hackathon view, and it calls the reset endpoint', async () => {
    mockGetHackathonConfigSettings.mockResolvedValue({
      settings: [
        { ...BASE_SETTINGS[0], value: '75', overridden: true },
        BASE_SETTINGS[1],
      ],
    })
    const user = userEvent.setup()
    renderWithProviders(<HackathonConfigSettings hackathonId="hack-1" />)
    await screen.findByText('Issue intake')

    expect(screen.getByText('overridden')).toBeInTheDocument()
    const resetButtons = screen.getAllByTitle('Reset to default')
    expect(resetButtons).toHaveLength(1)

    await user.click(resetButtons[0])

    await waitFor(() =>
      expect(mockResetHackathonConfigSetting).toHaveBeenCalledWith({ hackathon_id: 'hack-1', key: 'max_issues_per_org' }),
    )
  })
})
