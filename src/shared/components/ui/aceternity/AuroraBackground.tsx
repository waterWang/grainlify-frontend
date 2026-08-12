import type { ReactNode } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../../../utils/cn';

interface AuroraBackgroundProps {
  children: ReactNode;
  className?: string;
  /** Softer, smaller blobs — for panels rather than the page hero. */
  subtle?: boolean;
}

/**
 * Aceternity-style aurora, rebuilt for this codebase.
 *
 * Three differences from the upstream snippet, each deliberate:
 *
 *  - **Palette.** Upstream is indigo/violet/blue on near-black. This is the
 *    warm gold and cream the rest of the product uses (#c9983a / #d4af37 /
 *    #b89968), and it has a light-theme branch — upstream only has one look.
 *
 *  - **No animation.** Upstream drifts the aurora continuously. Three animated
 *    variants were built and measured here (transform+scale, transform-only,
 *    opacity-only) and every one of them cost most of the frame budget on a
 *    throttled CPU — 13-27 FPS idle against a 120 FPS baseline — because any
 *    change to a heavily blurred layer forces the compositor to re-rasterise
 *    it. The full numbers are in styles/theme.css. The drift was also on an
 *    18-38 second cycle, so it was invisible in practice. This renders a static
 *    wash, which is what the screenshots were actually showing.
 *
 *    A pleasant consequence: with nothing animating there is no reduced-motion
 *    branch to get wrong. The component is inert by construction.
 *
 * The blobs are wrapped in an `overflow-hidden` layer with `contain: paint`, so
 * a 500px blur cannot bleed onto neighbouring cards — a glassmorphism bug this
 * project has hit before.
 */
export function AuroraBackground({ children, className, subtle = false }: AuroraBackgroundProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const size = subtle ? 'w-[340px] h-[340px]' : 'w-[440px] h-[440px]';
  const blur = subtle ? 'blur-[70px]' : 'blur-[80px]';

  return (
    <div className={cn('relative overflow-hidden isolate', className)} style={{ contain: 'paint' }}>
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div
          className={cn(
            'absolute -top-1/3 -left-[10%] rounded-full',
            size,
            blur,
            isDark ? 'bg-[#c9983a]/25' : 'bg-[#c9983a]/30',
          )}
        />
        <div
          className={cn(
            'absolute -bottom-1/2 right-[-15%] rounded-full',
            size,
            blur,
            isDark ? 'bg-[#d4af37]/18' : 'bg-[#d4af37]/28',
          )}
        />
        {/* A third blob was measurably not worth it: three animated blurred
            layers cost roughly half the frame budget of two for a difference
            nobody can point at in a screenshot. */}
      </div>
      {children}
    </div>
  );
}
