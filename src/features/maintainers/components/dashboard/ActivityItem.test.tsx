import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders } from '../../../../test/renderWithProviders'
import { ActivityItem } from './ActivityItem'
import { Activity } from '../../types'

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 1,
    type: 'issue',
    number: 42,
    title: 'Fix the thing',
    label: null,
    timeAgo: '7 minutes ago',
    ...overrides,
  }
}

describe('ActivityItem', () => {
  it('renders an open issue with the gold dot indicator', () => {
    const { container } = renderWithProviders(
      <ActivityItem activity={makeActivity({ closed: false })} index={0} onClick={vi.fn()} />
    )
    expect(container.querySelector('.lucide-circle')).toBeInTheDocument()
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
  })

  it('renders a closed issue with a checkmark instead of the gold dot', () => {
    const { container } = renderWithProviders(
      <ActivityItem activity={makeActivity({ closed: true })} index={0} onClick={vi.fn()} />
    )
    expect(container.querySelector('.lucide-check')).toBeInTheDocument()
    expect(container.querySelector('.lucide-circle')).not.toBeInTheDocument()
  })

  it('defaults to the open (gold dot) treatment when closed is omitted', () => {
    const { container } = renderWithProviders(
      <ActivityItem activity={makeActivity()} index={0} onClick={vi.fn()} />
    )
    expect(container.querySelector('.lucide-circle')).toBeInTheDocument()
  })

  it('never applies the issue closed/open styling to a PR row', () => {
    const { container } = renderWithProviders(
      <ActivityItem
        activity={makeActivity({ type: 'pr', label: 'Merged', closed: true })}
        index={0}
        onClick={vi.fn()}
      />
    )
    // PRs render a GitPullRequest icon, not the issue circle/check treatment at all.
    expect(container.querySelector('.lucide-git-pull-request')).toBeInTheDocument()
    expect(container.querySelector('.lucide-circle')).not.toBeInTheDocument()
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
  })
})
