import type { ElementType, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type SurfaceTone = 'glass' | 'solid' | 'raised' | 'flat';

interface GlassCardProps {
  children: ReactNode;
  /**
   * 'glass'  — real backdrop-blur. Tier A hero surfaces only, where there is
   *            an aurora behind the panel actually worth blurring.
   * 'solid'  — the same card without a backdrop filter. The default, and what
   *            Tier B/C should use.
   * 'raised' — 'solid' with more contrast, for a panel sitting on another.
   * 'flat'   — Tier D admin: opaque, no lift, no shadow. A control panel.
   */
  tone?: SurfaceTone;
  /** Render as something other than a div (section, article, li...). */
  as?: ElementType;
  className?: string;
}

/**
 * The card surface used across the dashboard.
 *
 * ## Why 'solid' is the default and not 'glass'
 *
 * Every panel in this product used `backdrop-blur-[40px]`. Measured at 4x CPU
 * throttle, scrolling, with the blur dialled at runtime on an otherwise
 * identical DOM:
 *
 *                     current(40px)   8px    outer panels only   none
 *     Discover            26.8       38.7          39.3         120.0
 *     Leaderboard         21.2       33.4          29.1          85.8
 *
 * Lightening the blur or removing the nested ones buys about 45%. Removing the
 * backdrop filter is 4x. It was the single largest cost on both pages, larger
 * than everything else put together.
 *
 * And it was buying almost nothing. A backdrop filter only shows its work when
 * there is detail behind it to smear; behind these panels is a flat gradient,
 * so the blur was sampling a near-solid colour and producing a near-solid
 * colour, sixty times a second. With the filter removed the mean per-channel
 * difference was 3.9 (light) to 18.9 (dark) and the two are hard to tell apart
 * side by side.
 *
 * So 'solid' keeps the translucent card and drops the filter. 'glass' stays
 * available for Tier A, where an aurora sits behind the panel and the blur has
 * something real to do — and even there it should be measured rather than
 * assumed.
 *
 * ## Hard rule
 *
 * Nothing inside a `tone="glass"` card may animate persistently. Changing
 * anything inside a blurred panel invalidates the backdrop sample and forces
 * the blur to be recomputed across the whole panel every frame. See
 * docs/design-system.md, and glassAnimation.test.ts which enforces the
 * in-file case.
 */
export function GlassCard({
  children,
  tone = 'solid',
  as: Tag = 'div',
  className,
}: GlassCardProps) {
  const base = 'relative rounded-[24px] border transition-colors';

  const tones: Record<SurfaceTone, string> = {
    glass: 'backdrop-blur-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
    solid: 'shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
    raised: 'shadow-[0_12px_40px_rgba(0,0,0,0.10)]',
    flat: '',
  };

  const background: Record<SurfaceTone, string> = {
    glass: 'var(--brand-glass)',
    solid: 'var(--brand-surface)',
    raised: 'var(--brand-surface-raised)',
    flat: 'var(--brand-surface-flat)',
  };

  const borderColor: Record<SurfaceTone, string> = {
    glass: 'var(--brand-glass-border)',
    solid: 'var(--brand-surface-border)',
    raised: 'var(--brand-surface-border)',
    flat: 'var(--brand-surface-border)',
  };

  return (
    <Tag
      className={cn(base, tones[tone], className)}
      style={{ backgroundColor: background[tone], borderColor: borderColor[tone] }}
    >
      {children}
    </Tag>
  );
}
