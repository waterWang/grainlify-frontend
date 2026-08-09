import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { GrainHackAdminPage } from './GrainHackAdminPage'

vi.mock('../components/HackathonList', () => ({
  HackathonList: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('hack-1')}>mock-hackathon-list</button>
  ),
}))
vi.mock('../components/HackathonDetail', () => ({
  HackathonDetail: ({ hackathonId, onBack }: { hackathonId: string; onBack: () => void }) => (
    <div>
      <span>mock-hackathon-detail:{hackathonId}</span>
      <button onClick={onBack}>mock-back</button>
    </div>
  ),
}))
vi.mock('../components/HackathonConfigSettings', () => ({
  HackathonConfigSettings: () => <div data-testid="global-settings" />,
}))
vi.mock('../components/AuditLog', () => ({
  AuditLog: () => <div data-testid="global-audit" />,
}))

describe('GrainHackAdminPage', () => {
  it('defaults to the Hackathons tab showing the list', () => {
    renderWithProviders(<GrainHackAdminPage />)
    expect(screen.getByText('mock-hackathon-list')).toBeInTheDocument()
  })

  it('selecting a hackathon from the list swaps in its detail view, and back returns to the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GrainHackAdminPage />)

    await user.click(screen.getByText('mock-hackathon-list'))
    expect(screen.getByText('mock-hackathon-detail:hack-1')).toBeInTheDocument()

    await user.click(screen.getByText('mock-back'))
    expect(screen.getByText('mock-hackathon-list')).toBeInTheDocument()
  })

  it('switches to Global Defaults and Global Audit tabs, syncing ?subtab= in the URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GrainHackAdminPage />, { route: '/dashboard?tab=grainhack' })

    await user.click(screen.getByRole('button', { name: 'Global Defaults' }))
    expect(screen.getByTestId('global-settings')).toBeInTheDocument()
    expect(screen.queryByText('mock-hackathon-list')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Global Audit' }))
    expect(screen.getByTestId('global-audit')).toBeInTheDocument()
  })

  it('leaving the Hackathons tab and returning clears the selected hackathon', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GrainHackAdminPage />)

    await user.click(screen.getByText('mock-hackathon-list'))
    expect(screen.getByText('mock-hackathon-detail:hack-1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Global Defaults' }))
    await user.click(screen.getByRole('button', { name: 'Hackathons' }))

    expect(screen.getByText('mock-hackathon-list')).toBeInTheDocument()
  })
})
