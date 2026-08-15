import { describe, it, expect } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { RankBadgeCard, RANK_CARD_SIZE, ordinalSuffix } from './RankBadgeCard'

// Every rank state must occupy the same box.
//
// The card used to size to its content, so a contributor at "1000th" and one
// at "Unranked" rendered visibly different cards and the profile layout moved
// with their standing. jsdom does no layout - getBoundingClientRect is all
// zeroes - so measuring the rendered box here would assert nothing. What is
// asserted instead is the mechanism that guarantees the size: the explicit
// width/height applied to every state. A change that reintroduces
// content-sizing has to remove those, and this fails.

const TIERS = ['Conqueror', 'Ace', 'Crown', 'Diamond', 'Gold', 'Silver', 'Bronze']

/** Every state the card can be in, including the ones that differ in length. */
const STATES: Array<{ name: string; props: Parameters<typeof RankBadgeCard>[0] }> = [
  { name: 'unranked', props: { position: null, tierName: 'Unranked' } },
  { name: 'rank 1', props: { position: 1, tierName: 'Conqueror' } },
  { name: 'rank 11 (ordinal edge)', props: { position: 11, tierName: 'Ace' } },
  { name: 'rank 526', props: { position: 526, tierName: 'Bronze' } },
  // The longest realistic content: four-digit rank, longest tier name, and an
  // all-time line that is also at its longest.
  {
    name: 'rank 1000 + all-time',
    props: {
      position: 1000,
      tierName: 'Conqueror',
      allTime: { position: 1000, tierName: 'Conqueror' },
    },
  },
  // The case the all-time line exists for.
  {
    name: 'unranked this season but ranked all-time',
    props: { position: null, tierName: 'Unranked', allTime: { position: 526, tierName: 'Bronze' } },
  },
  { name: 'loading', props: { isLoading: true } },
  ...TIERS.map((t, i) => ({
    name: `tier ${t}`,
    props: { position: (i + 1) * 3, tierName: t } as Parameters<typeof RankBadgeCard>[0],
  })),
]

describe('RankBadgeCard renders every state at one fixed size', () => {
  it.each(STATES)('$name has the fixed dimensions', ({ props }) => {
    renderWithProviders(<RankBadgeCard {...props} />)
    const card = screen.getByTestId('rank-badge-card')
    expect(card.style.width).toBe(`${RANK_CARD_SIZE}px`)
    expect(card.style.height).toBe(`${RANK_CARD_SIZE}px`)
    cleanup()
  })

  // Both themes: the card's surface and text colours are theme-dependent, so a
  // change that made the size theme-dependent too would otherwise slip through.
  it.each(['light', 'dark'] as const)(
    'every state produces the same width/height as every other in %s mode',
    (theme) => {
      const sizes = new Set<string>()
      for (const { props } of STATES) {
        renderWithProviders(<RankBadgeCard {...props} />, { theme })
        const card = screen.getByTestId('rank-badge-card')
        sizes.add(`${card.style.width}x${card.style.height}`)
        cleanup()
      }
      expect(
        [...sizes],
        'all rank states must render at one size; more than one entry means the card sizes to its content again',
      ).toEqual([`${RANK_CARD_SIZE}px x ${RANK_CARD_SIZE}px`.replace(' x ', 'x')])
    },
  )
})

describe('RankBadgeCard content', () => {
  it('shows the position and tier when ranked', () => {
    renderWithProviders(<RankBadgeCard position={526} tierName="Bronze" />)
    expect(screen.getByTestId('rank-position').textContent).toBe('526th')
    expect(screen.getByTestId('rank-tier').textContent).toBe('Bronze')
    expect(screen.queryByTestId('rank-unranked')).not.toBeInTheDocument()
  })

  it('shows Unranked with the season qualifier when there is no position', () => {
    renderWithProviders(<RankBadgeCard position={null} tierName="Unranked" />)
    // "Unranked" alone reads as "you don't count". The season qualifier is what
    // makes it a statement about a window rather than about the person.
    expect(screen.getByTestId('rank-unranked').textContent).toContain('this season')
    expect(screen.queryByTestId('rank-position')).not.toBeInTheDocument()
  })

  it('shows the all-time line only when there is an all-time position', () => {
    renderWithProviders(<RankBadgeCard position={null} allTime={{ position: 526, tierName: 'Bronze' }} />)
    expect(screen.getByTestId('rank-all-time').textContent).toBe('All time · Bronze #526')
    cleanup()

    renderWithProviders(<RankBadgeCard position={4} tierName="Conqueror" allTime={null} />)
    expect(screen.queryByTestId('rank-all-time')).not.toBeInTheDocument()
  })

  it('renders no rank content while loading', () => {
    renderWithProviders(<RankBadgeCard isLoading position={1} tierName="Conqueror" />)
    expect(screen.getByTestId('rank-badge-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('rank-position')).not.toBeInTheDocument()
  })
})

describe('ordinalSuffix', () => {
  it('handles the teens, which the naive mod-10 rule gets wrong', () => {
    // The old inline version returned "st"/"nd"/"rd" only for exactly 1/2/3 and
    // "th" for everything else, so 21 rendered as "21th".
    expect(ordinalSuffix(11)).toBe('th')
    expect(ordinalSuffix(12)).toBe('th')
    expect(ordinalSuffix(13)).toBe('th')
    expect(ordinalSuffix(111)).toBe('th')
  })

  it('handles the rest', () => {
    const cases: Array<[number, string]> = [
      [1, 'st'], [2, 'nd'], [3, 'rd'], [4, 'th'],
      [21, 'st'], [22, 'nd'], [23, 'rd'], [100, 'th'], [101, 'st'], [1000, 'th'],
    ]
    for (const [n, want] of cases) {
      expect(ordinalSuffix(n), `${n}`).toBe(want)
    }
  })
})
