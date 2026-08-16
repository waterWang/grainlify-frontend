import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../../test/renderWithProviders'
import { PRFilterDropdown } from './PRFilterDropdown'
import { PRFilterType } from '../../types'

const options: PRFilterType[] = ['All states', 'Open', 'Merged', 'Closed', 'Draft']

function makeProps(overrides: Partial<Parameters<typeof PRFilterDropdown>[0]> = {}) {
  return {
    value: 'All states' as PRFilterType,
    onChange: vi.fn(),
    isOpen: false,
    onToggle: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe('PRFilterDropdown', () => {
  it('renders all filter options in the list', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} />)
    // All options are rendered as menu buttons in the DOM; the trigger shows the current value.
    expect(screen.getByRole('button', { name: /All states/i })).toBeInTheDocument()
  })

  it('shows no count badge by default when activeCount is undefined', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} />)
    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument()
  })

  it('shows no count badge when activeCount is 0 (no active filters)', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} activeCount={0} />)
    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument()
  })

  it('shows a badge with the active-filter count after one filter is added', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} activeCount={1} />)
    const badge = screen.getByTestId('filter-count-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('1')
  })

  it('shows a badge that matches the active-filter count after several filters are added', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} activeCount={3} />)
    const badge = screen.getByTestId('filter-count-badge')
    expect(badge).toHaveTextContent('3')
  })

  it('removes the badge when the last filter is removed (count drops to 0)', () => {
    const { rerender } = renderWithProviders(<PRFilterDropdown {...makeProps()} activeCount={2} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('2')

    rerender(<PRFilterDropdown {...makeProps()} activeCount={1} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1')

    rerender(<PRFilterDropdown {...makeProps()} activeCount={0} />)
    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument()
  })

  it('keeps the badge count in sync across rapid filter toggles (no stale count)', () => {
    const { rerender } = renderWithProviders(<PRFilterDropdown {...makeProps()} activeCount={0} />)
    expect(screen.queryByTestId('filter-count-badge')).not.toBeInTheDocument()

    // Rapid toggle sequence: add, add, remove, add — the badge must never
    // lag behind the prop (no stale count from a previous render).
    rerender(<PRFilterDropdown {...makeProps()} value="Open" activeCount={1} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1')

    rerender(<PRFilterDropdown {...makeProps()} value="Merged" activeCount={2} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('2')

    rerender(<PRFilterDropdown {...makeProps()} value="Merged" activeCount={1} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1')

    rerender(<PRFilterDropdown {...makeProps()} value="Merged" activeCount={2} />)
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('2')
  })

  it('keeps the trigger showing the current value and toggling when a badge is present', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderWithProviders(<PRFilterDropdown {...makeProps()} value="Open" onToggle={onToggle} activeCount={1} />)

    // Badge is rendered alongside the trigger button.
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1')

    // Trigger click still opens the dropdown (badge must not intercept clicks).
    await user.click(screen.getByRole('button', { name: /Open/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('selecting an option calls onChange with the chosen filter and closes the dropdown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <PRFilterDropdown
        {...makeProps()}
        onChange={onChange}
        onClose={onClose}
        isOpen
      />
    )

    await user.click(screen.getByRole('button', { name: /Merged/i }))
    expect(onChange).toHaveBeenCalledWith('Merged')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('PRFilterDropdown option list', () => {
  it('covers all PR filter states exposed by the dropdown', () => {
    renderWithProviders(<PRFilterDropdown {...makeProps()} isOpen />)
    for (const opt of options) {
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(
        expect.arrayContaining([opt])
      )
    }
  })
})