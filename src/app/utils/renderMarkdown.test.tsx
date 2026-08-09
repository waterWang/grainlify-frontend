import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RenderMarkdownContent from './renderMarkdown'

describe('RenderMarkdownContent', () => {
  it('strips an HTML comment instead of rendering it as visible text', () => {
    render(
      <RenderMarkdownContent
        content={'<!-- ghit#filepath: /some/path/.issues-work -->\n# Description\n\nBody text.'}
      />
    )

    expect(screen.queryByText(/ghit#filepath/)).not.toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Body text.')).toBeInTheDocument()
  })

  it('strips a multi-line HTML comment', () => {
    render(
      <RenderMarkdownContent
        content={'<!--\nhidden metadata\nspanning lines\n-->\nVisible paragraph.'}
      />
    )

    expect(screen.queryByText(/hidden metadata/)).not.toBeInTheDocument()
    expect(screen.getByText('Visible paragraph.')).toBeInTheDocument()
  })

  it('renders normal markdown (heading, bold, inline code) unaffected', () => {
    render(
      <RenderMarkdownContent
        content={'## Requirements\n\nSee **EVENTS_PROCESSING.md** and `src/routes/reprocess-events.ts`.'}
      />
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Requirements' })).toBeInTheDocument()
    expect(screen.getByText('EVENTS_PROCESSING.md').tagName).toBe('STRONG')
    expect(screen.getByText('src/routes/reprocess-events.ts').tagName).toBe('CODE')
  })

  it('renders an empty string without crashing', () => {
    const { container } = render(<RenderMarkdownContent content="" />)
    expect(container).toBeInTheDocument()
  })
})
