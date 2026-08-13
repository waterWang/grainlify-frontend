import { cn } from '../../../utils/cn';

interface GridBackgroundProps {
  className?: string;
  /** 'grid' draws lines, 'dots' draws a dot field. */
  variant?: 'grid' | 'dots';
  /** Fade the pattern out towards the edges so it never meets a card border. */
  masked?: boolean;
}

/**
 * Aceternity's grid / dot background, as a static layer.
 *
 * Static on purpose. Upstream pairs the pattern with a mouse-following
 * highlight that re-renders on every mousemove; over a full-width panel that is
 * a lot of main-thread work for decoration, and it is the first thing to feel
 * bad while scrolling. The pattern here is two CSS gradients and costs nothing
 * after paint.
 *
 * The line colour comes from --brand-hairline (styles/brand.css) rather than a
 * theme conditional, which is why this no longer needs useTheme. Deliberately
 * near-invisible: a pattern that reads as a pattern competes with the content
 * on top of it.
 */
export function GridBackground({ className, variant = 'grid', masked = true }: GridBackgroundProps) {
  const line = 'var(--brand-hairline)';

  const backgroundImage =
    variant === 'dots'
      ? `radial-gradient(${line} 1px, transparent 1px)`
      : `linear-gradient(to right, ${line} 1px, transparent 1px),
         linear-gradient(to bottom, ${line} 1px, transparent 1px)`;

  // Radial mask so the grid dissolves before it reaches the rounded corners,
  // instead of being sliced off by them.
  const mask = masked
    ? 'radial-gradient(ellipse 70% 70% at 50% 40%, black 40%, transparent 100%)'
    : undefined;

  return (
    <div
      aria-hidden="true"
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        backgroundImage,
        backgroundSize: variant === 'dots' ? '22px 22px' : '44px 44px',
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}
