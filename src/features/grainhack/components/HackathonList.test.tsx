import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { HackathonList } from './HackathonList'

const mockGetAdminHackathons = vi.fn()
const mockCreateHackathon = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getAdminHackathons: (...args: unknown[]) => mockGetAdminHackathons(...args),
  createHackathon: (...args: unknown[]) => mockCreateHackathon(...args),
}))

describe('HackathonList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty state with no hackathons yet', async () => {
    mockGetAdminHackathons.mockResolvedValue({ hackathons: [] })
    renderWithProviders(<HackathonList onSelect={vi.fn()} />)

    expect(await screen.findByText('No hackathons yet. Create one to get started.')).toBeInTheDocument()
  })

  it('lists hackathons with a human-readable phase label and selects one on click', async () => {
    mockGetAdminHackathons.mockResolvedValue({
      hackathons: [{ id: 'hack-1', name: 'GrainHack Spring 2026', phase: 'application_period' }],
    })
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<HackathonList onSelect={onSelect} />)

    const row = await screen.findByText('GrainHack Spring 2026')
    expect(screen.getByText('Application period')).toBeInTheDocument()

    await user.click(row)

    expect(onSelect).toHaveBeenCalledWith('hack-1')
  })

  it('the create button stays disabled until a name is entered, then creates a draft and selects it', async () => {
    mockGetAdminHackathons.mockResolvedValue({ hackathons: [] })
    mockCreateHackathon.mockResolvedValue({ id: 'new-hack-id' })
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<HackathonList onSelect={onSelect} />)
    await screen.findByText('No hackathons yet. Create one to get started.')

    await user.click(screen.getByRole('button', { name: /new hackathon/i }))
    expect(await screen.findByText('New GrainHack')).toBeInTheDocument()

    const createButton = screen.getByRole('button', { name: 'Create draft' })
    expect(createButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/e\.g\. grainhack/i), 'GrainHack Winter 2026')
    expect(createButton).toBeEnabled()

    await user.click(createButton)

    await waitFor(() => expect(mockCreateHackathon).toHaveBeenCalledWith('GrainHack Winter 2026'))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('new-hack-id'))
  })
})
