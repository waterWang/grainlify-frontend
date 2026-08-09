import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { RatingModal } from './RatingModal'
import { submitOrgRating } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  submitOrgRating: vi.fn(),
}))

const mockedSubmitOrgRating = vi.mocked(submitOrgRating)

describe('RatingModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    renderWithProviders(
      <RatingModal isOpen={false} onClose={vi.fn()} orgLogin="acme" onSubmitted={vi.fn()} />
    )
    expect(screen.queryByText('Rate this organization')).not.toBeInTheDocument()
  })

  it('disables submit until a star is picked, then submits the chosen rating', async () => {
    mockedSubmitOrgRating.mockResolvedValue({ ok: true })
    const onSubmitted = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <RatingModal isOpen onClose={vi.fn()} orgLogin="acme" onSubmitted={onSubmitted} />
    )

    const submitButton = screen.getByRole('button', { name: /submit review/i })
    expect(submitButton).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: '4 stars' }))
    expect(submitButton).toBeEnabled()

    await user.click(submitButton)

    await waitFor(() => {
      expect(mockedSubmitOrgRating).toHaveBeenCalledWith('acme', { rating: 4, comment: undefined })
    })
    expect(onSubmitted).toHaveBeenCalledWith(4, '')
  })

  it('includes a trimmed comment when one is written', async () => {
    mockedSubmitOrgRating.mockResolvedValue({ ok: true })
    const user = userEvent.setup()

    renderWithProviders(
      <RatingModal isOpen onClose={vi.fn()} orgLogin="acme" onSubmitted={vi.fn()} />
    )

    await user.click(screen.getByRole('radio', { name: '3 stars' }))
    await user.type(screen.getByPlaceholderText(/what was it like/i), '  Great experience  ')
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    await waitFor(() => {
      expect(mockedSubmitOrgRating).toHaveBeenCalledWith('acme', { rating: 3, comment: 'Great experience' })
    })
  })

  it('pre-fills the picker and comment, and labels the CTA as an edit, when initialRating is set', async () => {
    renderWithProviders(
      <RatingModal
        isOpen
        onClose={vi.fn()}
        orgLogin="acme"
        initialRating={5}
        initialComment="Already reviewed this"
        onSubmitted={vi.fn()}
      />
    )

    expect(screen.getByText('Edit your review')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5 stars' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByDisplayValue('Already reviewed this')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update review/i })).toBeEnabled()
  })

  it('shows an error message and does not close when submission fails', async () => {
    mockedSubmitOrgRating.mockRejectedValue(new Error('not_eligible'))
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <RatingModal isOpen onClose={onClose} orgLogin="acme" onSubmitted={vi.fn()} />
    )

    await user.click(screen.getByRole('radio', { name: '2 stars' }))
    await user.click(screen.getByRole('button', { name: /submit review/i }))

    expect(await screen.findByText('not_eligible')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    renderWithProviders(
      <RatingModal isOpen onClose={onClose} orgLogin="acme" onSubmitted={vi.fn()} />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
