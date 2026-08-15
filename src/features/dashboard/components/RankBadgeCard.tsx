import type { ReactNode } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

/**
 * The rank trophy on the profile.
 *
 * The translucent, glowing, layered treatment is deliberate - it matches the
 * glass surfaces the rest of the interface is built from. An earlier pass
 * flattened this to an opaque gold card to make contrast trivially provable;
 * that measured well and looked like a foreign element pasted onto the page.
 * The surface is back, and only the text colours are doing the work.
 *
 * # Why the text colours are per-theme
 *
 * The card is an alpha wash, so it composites against the page and is a
 * different colour in each theme - which is exactly the trap that makes a pair
 * pass in one theme and fail in the other:
 *
 *   light page #e8dfd0  ->  card composites to #dcc394   (light: needs INK)
 *   dark  page #2d2820  ->  card composites to #6b552a   (dark:  needs CREAM)
 *
 * No single colour clears AA on both. Measured against the real rendered
 * result, worst gradient stop, at the size each is actually set:
 *
 *   light  ink   #2d2820 on #dcc394   8.52 : 1    primary
 *   light  muted #4a4038 on #dcc394   5.87 : 1    secondary
 *   dark   cream #e8dfd0 on #6b552a   5.38 : 1    primary and secondary
 *
 * Dark's secondary is NOT dimmed. Every step down from cream fails there -
 * #ddd0bd is 4.68 and #b8a898 is 3.07 - so hierarchy in dark comes from size
 * and weight rather than from colour. Light has enough headroom to dim.
 *
 * # The tier chip
 *
 * Its original bg-white/[0.3] is unusable in dark: on the composited chip
 * (#98886a) NOTHING reaches 4.5 - ink is 4.21, cream 2.63, gold 1.33. Rather
 * than flatten it, the chip keeps a wash and changes which wash: white in
 * light (ink text, 10.11), ink in dark (gold text, ~5.2). Still translucent,
 * still layered, and legible in both.
 *
 * # The rank number
 *
 * Gradient-clipped text has a transparent computed colour, so a contrast
 * auditor cannot measure it at all - it is the "unmeasurable" case from the
 * landing audit and is reported separately rather than counted. The gradient
 * is kept because it is part of the treatment, but its stops are chosen so
 * every stop sits on the safe side of the card: all-dark in light mode,
 * all-light in dark mode. The old version ended on #c9983a, which put the
 * bottom of the digits in gold on a gold card.
 *
 * # Size
 *
 * Fixed 300x300 so every rank state renders identically - "Unranked" and
 * "1000th" used to produce different boxes and the layout moved with a
 * contributor's standing. Sized for the longest realistic content: a
 * four-digit rank with an ordinal suffix plus "Conqueror".
 */

/** Fixed so every rank state occupies the same box. Exported for the test. */
export const RANK_CARD_SIZE = 300;

export type RankBadgeCardProps = {
  position?: number | null;
  tierName?: string | null;
  allTime?: { position?: number | null; tierName?: string | null } | null;
  icon?: ReactNode;
  isLoading?: boolean;
};

/** 1st, 2nd, 3rd, 4th... and 11th/12th/13th, which the naive rule gets wrong.
 *  The inline version this replaces special-cased only 1, 2 and 3, so rank 21
 *  rendered as "21th". */
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const box = { width: `${RANK_CARD_SIZE}px`, height: `${RANK_CARD_SIZE}px` };

  // Primary and secondary text, per theme. See the header for the ratios.
  const primary = isDark ? 'text-[var(--brand-cream)]' : 'text-[var(--brand-gold-on)]';
  const secondary = isDark
    ? 'text-[var(--brand-cream)]'
    : 'text-[var(--brand-gold-on-muted)]';

  // Gradient stops kept entirely on one side of the card's luminance.
  const numberGradient = isDark
    ? 'from-white via-[var(--brand-cream)] to-[var(--brand-cream)]'
    : 'from-[var(--brand-gold-on)] via-[var(--brand-gold-on)] to-[var(--brand-gold-on-muted)]';

  return (
    <div className="relative flex-shrink-0" style={box}>
      {/* Outer glow, two layers. Purely decorative and behind everything.
          Dimmer in dark: the glow bleeds through the translucent card and was
          the largest single contributor to it compositing to #90772f there - a
          mid-tone where neither cream nor ink clears AA. Measured, not
          reasoned about. */}
      <div
        aria-hidden
        className={`absolute inset-0 rounded-[28px] blur-2xl bg-gradient-to-br from-[var(--brand-gold)]/50 via-[var(--brand-gold-bright)]/35 to-transparent ${
          isDark ? 'opacity-40' : 'opacity-80'
        }`}
      />
      <div
        aria-hidden
        className={`absolute inset-0 rounded-[28px] blur-xl bg-gradient-to-br from-[var(--brand-gold-bright)]/30 to-transparent ${
          isDark ? 'opacity-40' : 'opacity-100'
        }`}
      />

      <div
        data-testid="rank-badge-card"
        style={box}
        className={`relative rounded-[28px] flex flex-col items-center justify-center px-6 text-center
                    border-[3.5px] ${isDark ? 'border-white/20' : 'border-white/50'}
                    shadow-[0_15px_60px_rgba(201,152,58,0.45),inset_0_2px_4px_rgba(255,255,255,0.35)]
                    ${
                      isDark
                        ? 'bg-gradient-to-br from-[var(--brand-gold)]/22 via-[var(--brand-gold-bright)]/16 to-[var(--brand-gold)]/14'
                        : 'bg-gradient-to-br from-[var(--brand-gold)]/40 via-[var(--brand-gold-bright)]/30 to-[var(--brand-gold)]/25'
                    }`}
      >
        {/* Decorative corner dots, part of the original treatment. */}
        <div aria-hidden className="absolute top-4 left-4 w-3.5 h-3.5 rounded-full bg-white/50" />
        <div aria-hidden className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-[var(--brand-gold)]/70" />
        <div aria-hidden className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white/40" />

        {isLoading ? (
          <div
            data-testid="rank-badge-loading"
            className="h-16 w-40 rounded-[12px] bg-white/25 animate-pulse"
          />
        ) : (
          <>
            {position ? (
              <div
                data-testid="rank-position"
                className={`text-[64px] font-black leading-none bg-gradient-to-b bg-clip-text text-transparent drop-shadow-[0_2px_6px_rgba(45,40,32,0.25)] ${numberGradient}`}
                style={{ letterSpacing: '-0.02em' }}
              >
                {position}
                <span className="text-[32px] align-super">{ordinalSuffix(position)}</span>
              </div>
            ) : (
              <div data-testid="rank-unranked">
                <div className={`text-[40px] font-black leading-none ${primary}`}>Unranked</div>
                <div className={`mt-1.5 text-[13px] font-semibold ${secondary}`}>this season</div>
              </div>
            )}

            <div
              aria-hidden
              className="h-[3px] w-20 my-4 rounded-full bg-gradient-to-r from-transparent via-[var(--brand-gold)]/80 to-transparent"
            />

            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border-2 ${
                isDark
                  ? 'bg-[var(--brand-gold-on)]/60 border-[var(--brand-gold)]/40'
                  : 'bg-white/[0.3] border-[var(--brand-gold)]/50'
              }`}
            >
              {icon}
              <span
                data-testid="rank-tier"
                className={`text-[13px] font-black uppercase tracking-[0.15em] ${
                  isDark ? 'text-[var(--brand-gold-bright)]' : 'text-[var(--brand-gold-on)]'
                }`}
              >
                {tierName || 'Unranked'}
              </span>
            </div>

            {allTime?.position ? (
              <div data-testid="rank-all-time" className={`mt-3 text-[12px] font-semibold ${secondary}`}>
                All time · {allTime.tierName} #{allTime.position}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
