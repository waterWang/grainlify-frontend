import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EcosystemLogo } from './EcosystemLogo'

describe('EcosystemLogo', () => {
  it('shows the brand mark for a known ecosystem instead of its first letter', () => {
    render(<EcosystemLogo name="Stellar" />)
    expect(screen.getByRole('img', { name: 'Stellar logo' })).toBeInTheDocument()
    // The whole point: no bare "S" tile.
    expect(screen.queryByText('S')).not.toBeInTheDocument()
  })

  it('matches on the slug as well as the name', () => {
    render(<EcosystemLogo name="Starknet Foundation" slug="starknet" />)
    expect(screen.getByRole('img', { name: 'Starknet logo' })).toBeInTheDocument()
  })

  it('is case- and punctuation-insensitive', () => {
    render(<EcosystemLogo name="STAR-KNET" />)
    expect(screen.getByRole('img', { name: 'Starknet logo' })).toBeInTheDocument()
  })

  it('prefers an uploaded logo over the built-in mark', () => {
    // Someone who set a logo in admin meant it to be used, even for an
    // ecosystem we happen to ship a mark for.
    render(<EcosystemLogo name="Stellar" logoUrl="https://example.com/custom.png" />)
    expect(screen.getByAltText('Stellar logo')).toHaveAttribute(
      'src',
      'https://example.com/custom.png',
    )
    // Both branches expose the same accessible name, so distinguish by what
    // was actually rendered: the uploaded <img>, not the built-in mark's tile.
    expect(screen.getByRole('img', { name: 'Stellar logo' }).tagName).toBe('IMG')
  })

  it('treats a blank logo url as no logo', () => {
    render(<EcosystemLogo name="Stellar" logoUrl="   " />)
    expect(screen.getByRole('img', { name: 'Stellar logo' })).toBeInTheDocument()
  })

  it('falls back to the first letter for an ecosystem with no mark', () => {
    render(<EcosystemLogo name="Polkadot" />)
    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('does not claim an ecosystem whose name merely contains a known one', () => {
    // "Stellar Community Fund" is not Stellar. Substring matching would put
    // the wrong brand on someone else's card.
    render(<EcosystemLogo name="Stellar Community Fund" />)
    expect(screen.queryByRole('img', { name: 'Stellar logo' })).not.toBeInTheDocument()
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('renders a placeholder rather than crashing on a missing name', () => {
    render(<EcosystemLogo />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
