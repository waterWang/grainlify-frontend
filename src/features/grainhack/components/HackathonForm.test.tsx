import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { HackathonForm } from './HackathonForm'

const mockUpdateHackathon = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  updateHackathon: (...args: unknown[]) => mockUpdateHackathon(...args),
}))

const HACKATHON = {
  id: 'hack-1',
  name: 'GrainHack Spring 2026',
  phase: 'draft' as const,
  announced_at: null,
  application_period_start: null,
  application_period_end: null,
  issue_prep_start: null,
  starts_at: null,
  ends_at: null,
  merge_grace_period_hours: 48,
  contributor_prize_pool: null,
  maintainer_prize_pool: null,
  created_at: new Date().toISOString(),
}

describe('HackathonForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUpdateHackathon.mockResolvedValue(HACKATHON)
  })

  it('pre-fills fields from the given hackathon', () => {
    renderWithProviders(<HackathonForm hackathon={HACKATHON} onSaved={vi.fn()} />)

    expect(screen.getByDisplayValue('GrainHack Spring 2026')).toBeInTheDocument()
    expect(screen.getByDisplayValue('48')).toBeInTheDocument()
  })

  it('saving sends edited text/number fields and omits untouched empty date fields', async () => {
    const onSaved = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<HackathonForm hackathon={HACKATHON} onSaved={onSaved} />)

    const nameInput = screen.getByDisplayValue('GrainHack Spring 2026')
    await user.clear(nameInput)
    await user.type(nameInput, 'GrainHack Summer 2026')

    const graceInput = screen.getByDisplayValue('48')
    await user.clear(graceInput)
    await user.type(graceInput, '72')

    await user.click(screen.getByRole('button', { name: 'Save fields' }))

    await waitFor(() => expect(mockUpdateHackathon).toHaveBeenCalledTimes(1))
    const [id, payload] = mockUpdateHackathon.mock.calls[0]
    expect(id).toBe('hack-1')
    expect(payload).toMatchObject({ name: 'GrainHack Summer 2026', merge_grace_period_hours: 72 })
    // Never-set datetime-local fields (announced_at etc.) stay '' and must not
    // be sent as an invalid/epoch date.
    expect(payload).not.toHaveProperty('announced_at')
    expect(payload).not.toHaveProperty('starts_at')
    expect(payload).not.toHaveProperty('ends_at')

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
  })

  it('converts a filled-in datetime-local field to a full ISO string', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HackathonForm hackathon={HACKATHON} onSaved={vi.fn()} />)

    const startsAtLabel = screen.getByText('Starts at (live)')
    const startsAtInput = startsAtLabel.parentElement?.querySelector('input') as HTMLInputElement
    expect(startsAtInput).toBeTruthy()

    await user.type(startsAtInput, '2026-09-01T10:00')
    await user.click(screen.getByRole('button', { name: 'Save fields' }))

    await waitFor(() => expect(mockUpdateHackathon).toHaveBeenCalledTimes(1))
    const [, payload] = mockUpdateHackathon.mock.calls[0]
    // The component reads the datetime-local string as local time and
    // converts to ISO/UTC for the API - compute the same way rather than
    // hardcoding a UTC hour, since that would be timezone-dependent.
    expect(payload.starts_at).toBe(new Date('2026-09-01T10:00').toISOString())
  })
})
