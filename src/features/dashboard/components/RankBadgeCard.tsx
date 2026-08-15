import type { ReactNode } from 'react';

/**
 * The rank trophy on the profile.
 *
 * Two things here are deliberate and were both bugs before.
 *
 * COLOUR. The card is gold, so text on it must be ink - not more gold. The
 * previous version set the tier name in #c9983a on a gold card (gold on gold,
 * about 1.5:1) and the all-time line in #7a6b5a (grey on gold). Both were
 * unreadable, and both are the same mistake as the white-on-gold pair that
 * measured 2.61 in the light-mode audit.
 *
 * The card background is now OPAQUE rather than a stack of alpha gradients.
 * An alpha wash composites against whatever is behind it, so its contrast
 * depends on the page rather than on the class name - which is how a pair can
 * measure fine in one theme and fail in the other. Opaque means the ratios
 * below hold everywhere:
 *
 *   --brand-gold-on       #2d2820 on #d4af37   6.95 : 1
 *   --brand-gold-on-muted #4a4038 on #d4af37   4.80 : 1
 *   --brand-gold-bright   #d4af37 on #2d2820   6.95 : 1   (the tier chip)
 *
 * The card is identical in both themes on purpose: it is a trophy, and a gold
 * medal does not change colour with the page. That also removes a whole class
 * of theme-dependent contrast bug from a component whose entire job is to be
 * legible at a glance.
 *
 * The rank number is solid ink rather than bg-clip-text. Gradient-clipped text
 * has a transparent computed colour, so it cannot be contrast-audited at all -
 * it is the "unmeasurable" case from the landing audit, and there is no reason
 * to accept it on the one element that must be readable.
 *
 * SIZE. The card is a fixed square. It used to size to its content, so
 * "Unranked" and "1000th" produced visibly different boxes and the profile
 * layout shifted with a contributor's standing. The dimensions below fit the
 * longest realistic content - a four-digit rank with an ordinal suffix, and
 * "Conqueror", the longest tier name - and everything shorter centres inside.
 * RankBadgeCard.test.tsx asserts every state renders at the same size.
 */

/** Fixed so every rank state occupies the same box. Exported for the test that
 *  asserts they all do. */
export const RANK_CARD_SIZE = 300;

export type RankBadgeCardProps = {
  /** Seasonal position. null/undefined renders the Unranked state. */
  position?: number | null;
  tierName?: string | null;
  allTime?: { position?: number | null; tierName?: string | null } | null;
  /** Tier medal/icon, supplied by the caller so this component owns no art. */
  icon?: ReactNode;
  isLoading?: boolean;
};

/** 1st, 2nd, 3rd, 4th... and 11th/12th/13th, which the naive rule gets wrong. */
export function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

export function RankBadgeCard({
  position,
  tierName,
  allTime,
  icon,
  isLoading = false,
}: RankBadgeCardProps) {
  const size = { width: `${RANK_CARD_SIZE}px`, height: `${RANK_CARD_SIZE}px` };

  return (
    <div
      data-testid="rank-badge-card"
      style={size}
      className="relative rounded-[28px] flex flex-col items-center justify-center px-6 text-center
                 bg-[var(--brand-gold-bright)] border-[3px] border-[var(--brand-gold-on)]/15
                 shadow-[0_12px_40px_rgba(45,40,32,0.18)]"
    >
      {isLoading ? (
        <div
          className="h-16 w-40 rounded-[12px] bg-[var(--brand-gold-on)]/10 animate-pulse"
          data-testid="rank-badge-loading"
        />
      ) : (
        <>
          {/* Rank number, or the Unranked state. Both are sized so the block
              occupies comparable height and the card does not need to reflow. */}
          {position ? (
            <div
              data-testid="rank-position"
              className="text-[64px] font-black leading-none text-[var(--brand-gold-on)]"
              style={{ letterSpacing: '-0.02em' }}
            >
              {position}
              <span className="text-[32px] align-super">{ordinalSuffix(position)}</span>
            </div>
          ) : (
            <div data-testid="rank-unranked">
              <div className="text-[40px] font-black leading-none text-[var(--brand-gold-on)]">
                Unranked
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-[var(--brand-gold-on-muted)]">
                this season
              </div>
            </div>
          )}

          <div className="h-[3px] w-20 my-4 rounded-full bg-[var(--brand-gold-on)]/25" />

          {/* Tier chip: the contrast is inverted here - ink field, gold text -
              so the tier reads as a plaque on the medal rather than dissolving
              into it. */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[var(--brand-gold-on)]">
            {icon}
            <span
              data-testid="rank-tier"
              className="text-[13px] font-black uppercase tracking-[0.15em] text-[var(--brand-gold-bright)]"
            >
              {tierName || 'Unranked'}
            </span>
          </div>

          {/* All-time, only when it says something the seasonal line does not.
              Most valuable in exactly the case that reads worst without it:
              unranked this season, but ranked all-time. */}
          {allTime?.position ? (
            <div
              data-testid="rank-all-time"
              className="mt-3 text-[12px] font-semibold text-[var(--brand-gold-on-muted)]"
            >
              All time · {allTime.tierName} #{allTime.position}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
