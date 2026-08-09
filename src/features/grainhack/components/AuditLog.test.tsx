import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders, screen, waitFor } from '../../../test/renderWithProviders'
import { AuditLog } from './AuditLog'

const mockGetHackathonConfigAudit = vi.fn()

vi.mock('../../../shared/api/client', () => ({
  getHackathonConfigAudit: (...args: unknown[]) => mockGetHackathonConfigAudit(...args),
}))

describe('AuditLog', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty state when there are no recorded changes', async () => {
    mockGetHackathonConfigAudit.mockResolvedValue({ entries: [] })
    renderWithProviders(<AuditLog hackathonId="hack-1" />)

    expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument()
  })

  it('renders a config-value change with its old -> new arrow and actor', async () => {
    mockGetHackathonConfigAudit.mockResolvedValue({
      entries: [
        {
          id: 'audit-1',
          hackathon_id: 'hack-1',
          key: 'max_issues_per_org',
          old_value: '50',
          new_value: '75',
          actor_user_id: 'user-1',
          actor_login: 'octocat',
          created_at: new Date().toISOString(),
        },
      ],
    })

    renderWithProviders(<AuditLog hackathonId="hack-1" />)

    expect(await screen.findByText('max_issues_per_org')).toBeInTheDocument()
    expect(screen.getByText('50 → 75')).toBeInTheDocument()
    expect(screen.getByText(/@octocat/)).toBeInTheDocument()
  })

  it('labels key="phase" rows as "Phase transition" rather than the raw key', async () => {
    mockGetHackathonConfigAudit.mockResolvedValue({
      entries: [
        {
          id: 'audit-2',
          hackathon_id: 'hack-1',
          key: 'phase',
          old_value: 'draft',
          new_value: 'application_period',
          actor_user_id: 'user-1',
          actor_login: 'octocat',
          created_at: new Date().toISOString(),
        },
      ],
    })

    renderWithProviders(<AuditLog hackathonId="hack-1" />)

    expect(await screen.findByText('Phase transition')).toBeInTheDocument()
    expect(screen.queryByText('phase')).not.toBeInTheDocument()
    expect(screen.getByText('draft → application_period')).toBeInTheDocument()
  })

  it('shows "unknown actor" and "(unset)" when those fields are null', async () => {
    mockGetHackathonConfigAudit.mockResolvedValue({
      entries: [
        {
          id: 'audit-3',
          hackathon_id: null,
          key: 'grainhack_label',
          old_value: null,
          new_value: 'GrainHack 2026',
          actor_user_id: null,
          actor_login: null,
          created_at: new Date().toISOString(),
        },
      ],
    })

    renderWithProviders(<AuditLog />)

    expect(await screen.findByText('(unset) → GrainHack 2026')).toBeInTheDocument()
    expect(screen.getByText(/unknown actor/)).toBeInTheDocument()
  })

  it('requests the global feed (hackathon_id: undefined) when no hackathonId prop is given', async () => {
    mockGetHackathonConfigAudit.mockResolvedValue({ entries: [] })
    renderWithProviders(<AuditLog />)

    await waitFor(() =>
      expect(mockGetHackathonConfigAudit).toHaveBeenCalledWith({ hackathon_id: undefined, limit: 100 }),
    )
  })
})
