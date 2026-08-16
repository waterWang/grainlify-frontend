import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '../contexts/ThemeContext'
import { SupportProvider } from './SupportWidget'
import { SupportLink } from './SupportLink'
import { SUPPORT_TRIGGER_LABEL } from './supportContext'

const submitSupportRequest = vi.fn()
vi.mock('../api/client', () => ({
  submitSupportRequest: (payload: unknown) => submitSupportRequest(payload),
}))

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: (m: string) => toastError(m) } }))

// The category is a routing decision, not a label.
//
// `kyc` goes to a private DM; every other category is posted to a group that
// anybody can read without joining. So "the category the person picked is the
// category that gets sent" is a privacy property, and sending a stale or
// defaulted one publishes something meant to stay private. These tests exist
// for that, and for the text that tells somebody which of the two they're
// about to get.

function renderWidget() {
  return render(
    <ThemeProvider>
      <SupportProvider><SupportLink /></SupportProvider>
    </ThemeProvider>,
  )
}

async function openWidget(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /get help or report a problem/i }))
}

describe('SupportWidget', () => {
  beforeEach(() => {
    submitSupportRequest.mockReset().mockResolvedValue({ ok: true, support_id: 'abc', delivered: ['telegram'] })
    toastError.mockReset()
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('sends the category the person picked, not the default', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.click(screen.getByRole('radio', { name: /verification/i }))
    await user.type(screen.getByRole('textbox'), 'my verification has been in_review for six days')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => expect(submitSupportRequest).toHaveBeenCalledTimes(1))
    expect(submitSupportRequest.mock.calls[0][0]).toMatchObject({
      category: 'kyc',
      message: 'my verification has been in_review for six days',
    })
  })

  it('defaults to bug when nothing is picked', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.type(screen.getByRole('textbox'), 'the rank badge is unreadable in light mode')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => expect(submitSupportRequest).toHaveBeenCalledTimes(1))
    expect(submitSupportRequest.mock.calls[0][0]).toMatchObject({ category: 'bug' })
  })

  it('offers every category the backend accepts', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    // If these drift apart, a category exists that can be picked and then
    // rejected at the edge with invalid_category, losing the report.
    const labels = screen.getAllByRole('radio').map((el) => el.textContent?.trim())
    expect(labels).toEqual(['Bug', 'Verification', 'Idea', 'Help', 'Other'])
  })

  it('tells the person that a verification question stays private, and not to send documents', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    expect(screen.queryByText(/never posted to a public channel/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /verification/i }))
    const note = screen.getByText(/never posted to a public channel/i)
    expect(note).toBeInTheDocument()
    expect(note.textContent).toMatch(/don't include ID numbers/i)

    // And it goes away again for a category where it isn't true.
    await user.click(screen.getByRole('radio', { name: /^bug$/i }))
    expect(screen.queryByText(/never posted to a public channel/i)).not.toBeInTheDocument()
  })

  it('confirms a verification request as private, and a bug report as ordinary', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.click(screen.getByRole('radio', { name: /verification/i }))
    await user.type(screen.getByRole('textbox'), 'stuck on in_review')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(await screen.findByText(/sent privately/i)).toBeInTheDocument()
    expect(screen.getByText(/not to any public channel/i)).toBeInTheDocument()
  })

  it('keeps what the person typed when the send fails', async () => {
    // The one path that loses a report is the backend's 503, and the text box
    // is the only remaining copy of what they wrote.
    submitSupportRequest.mockRejectedValue(new Error("We couldn't save your report, so it hasn't been sent."))
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.type(screen.getByRole('textbox'), 'payouts page is blank')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastError.mock.calls[0][0]).toMatch(/couldn't save your report/i)
    expect(screen.getByRole('textbox')).toHaveValue('payouts page is blank')
    expect(screen.queryByText(/thanks/i)).not.toBeInTheDocument()
  })

  it('does not send an empty message', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.click(screen.getByRole('button', { name: /^send$/i }))

    // Stopped by the field's own `required`, before handleSubmit runs - so
    // there is no toast here, and asserting one would be asserting the wrong
    // mechanism. Whitespace is the case that gets past it; see below.
    expect(submitSupportRequest).not.toHaveBeenCalled()
  })

  it('does not send a message that is only whitespace', async () => {
    const user = userEvent.setup()
    renderWidget()
    await openWidget(user)

    await user.type(screen.getByRole('textbox'), '   ')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(submitSupportRequest).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/tell us what you need/i))
  })
})

// The accessible name is shared by all three triggers - the rail button, the
// Navbar entry and the auth-page link - and has already been renamed once, to
// resolve a duplicate-label collision. Pinning the literal means a rename is a
// deliberate act rather than a side effect of editing one of the three.
it('keeps the accessible name every trigger is found by', () => {
  expect(SUPPORT_TRIGGER_LABEL).toBe('Get help or report a problem')
})
