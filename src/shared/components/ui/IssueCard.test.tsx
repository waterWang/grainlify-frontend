import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { IssueCard } from './IssueCard'

describe('IssueCard', () => {
  it('renders an open issue with the gold dot indicator, not a checkmark', () => {
    const { container } = renderWithProviders(
      <IssueCard id="1" number="#1" title="An open issue" onClick={vi.fn()} />
    )
    expect(container.querySelector('.lucide-circle')).toBeInTheDocument()
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument()
  })

  it('renders a closed issue with a checkmark indicator instead of the gold dot', () => {
    const { container } = renderWithProviders(
      <IssueCard id="1" number="#1" title="A closed issue" isClosed onClick={vi.fn()} />
    )
    expect(container.querySelector('.lucide-check')).toBeInTheDocument()
    expect(container.querySelector('.lucide-circle')).not.toBeInTheDocument()
  })

  it('still renders the title and number for a closed issue', () => {
    renderWithProviders(<IssueCard id="1" number="#42" title="Fix the thing" isClosed onClick={vi.fn()} />)
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('Fix the thing')).toBeInTheDocument()
  })
})
