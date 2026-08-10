import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '../../../test/renderWithProviders'
import { ApplicationWindow, formatTimeLeft, windowStateOf } from './ApplicationWindow'

const NOW = Date.UTC(2026, 7, 10, 12, 0, 0)
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString()

describe('formatTimeLeft', () => {
  it.each([
    [0, 'closed'],
    [-5000, 'closed'],
    [30_000, 'less than a minute'],
    [60_000, '1 minute'],
    [5 * 60_000, '5 minutes'],
    [60 * 60_000, '1 hour'],
    [90 * 60_000, '1h 30m'],
    [24 * 3600_000, '1 day'],
    [50 * 3600_000, '2d 2h'],
  ])('%dms -> %s', (ms, expected) => {
    expect(formatTimeLeft(ms as number)).toBe(expected)
  })
})

describe('windowStateOf', () => {
  it('is not_open before the window opens', () => {
    expect(windowStateOf(at(3600_000), at(7200_000), NOW)).toBe('not_open')
  })

  it('is open between the two timestamps', () => {
    expect(windowStateOf(at(-3600_000), at(3600_000), NOW)).toBe('open')
  })

  it('is closed once the close time has passed', () => {
    expect(windowStateOf(at(-7200_000), at(-3600_000), NOW)).toBe('closed')
  })

  it('treats a missing window as open, since nothing bounds it', () => {
    expect(windowStateOf(null, null, NOW)).toBe('open')
  })
})

describe('ApplicationWindow', () => {
  it('counts down while the window is open and shows the pool size', () => {
    renderWithProviders(
      <ApplicationWindow
        opensAt={new Date(Date.now() - 3600_000).toISOString()}
        closesAt={new Date(Date.now() + 2 * 3600_000).toISOString()}
        applicantCount={4}
      />,
    )
    expect(screen.getByText(/left to apply/)).toBeInTheDocument()
    expect(screen.getByText('4 applicants')).toBeInTheDocument()
  })

  it('uses the singular for a single applicant', () => {
    renderWithProviders(
      <ApplicationWindow opensAt={null} closesAt={new Date(Date.now() + 3600_000).toISOString()} applicantCount={1} />,
    )
    expect(screen.getByText('1 applicant')).toBeInTheDocument()
  })

  it('says the draw is coming once the window has closed', () => {
    renderWithProviders(
      <ApplicationWindow opensAt={null} closesAt={new Date(Date.now() - 60_000).toISOString()} />,
    )
    expect(screen.getByText('Applications closed - the draw runs shortly')).toBeInTheDocument()
  })

  it('counts down to opening when the window has not started', () => {
    renderWithProviders(
      <ApplicationWindow
        opensAt={new Date(Date.now() + 3 * 3600_000).toISOString()}
        closesAt={new Date(Date.now() + 9 * 3600_000).toISOString()}
      />,
    )
    expect(screen.getByText(/Applications open in/)).toBeInTheDocument()
  })

  it('shows a coarse band instead of an exact number when bucketing', () => {
    renderWithProviders(
      <ApplicationWindow
        opensAt={null}
        closesAt={new Date(Date.now() + 3600_000).toISOString()}
        applicantCount={null}
        applicantBucket="many"
      />,
    )
    expect(screen.getByText('many applicants')).toBeInTheDocument()
  })

  it('shows nothing about the pool when the count is hidden entirely', () => {
    renderWithProviders(
      <ApplicationWindow
        opensAt={null}
        closesAt={new Date(Date.now() + 3600_000).toISOString()}
        applicantCount={null}
        applicantBucket=""
      />,
    )
    expect(screen.queryByText(/applicant/)).not.toBeInTheDocument()
  })

  it('prefers the exact count when the event publishes it', () => {
    renderWithProviders(
      <ApplicationWindow
        opensAt={null}
        closesAt={new Date(Date.now() + 3600_000).toISOString()}
        applicantCount={7}
        applicantBucket="many"
      />,
    )
    expect(screen.getByText('7 applicants')).toBeInTheDocument()
    expect(screen.queryByText('many applicants')).not.toBeInTheDocument()
  })

  it('flags a newcomer-reserved issue', () => {
    renderWithProviders(
      <ApplicationWindow opensAt={null} closesAt={new Date(Date.now() + 3600_000).toISOString()} reserved />,
    )
    expect(screen.getByText('Newcomers only')).toBeInTheDocument()
  })
})
