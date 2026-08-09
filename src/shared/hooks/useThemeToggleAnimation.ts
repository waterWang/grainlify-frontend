import { useRef } from "react";
import { flushSync } from "react-dom";

interface UseThemeToggleAnimationOptions {
  onToggle: () => void;
  duration?: number;
}

// Brand gold, matches --primary in theme.css.
const GLOW_COLOR = "201, 152, 58";

// easeOutExpo (easings.net) - the "expo-out" curve a diagonal wipe like this
// is usually paired with: fast start, long soft settle.
const EASE_OUT_EXPO = "cubic-bezier(0.19, 1, 0.22, 1)";

// Diagonal-wipe theme toggle via the View Transitions API: a triangle
// anchored at the top-left corner, its two legs growing well past the
// viewport so the hypotenuse sweeps across the screen as a straight
// diagonal edge before the triangle swallows it whole. A `drop-shadow`
// animated alongside gives the edge a soft gold glow.
//
// The glow is a `filter: drop-shadow()` on the pseudo-element itself, not a
// separate DOM overlay - `::view-transition-*` pseudo-elements render in the
// browser's top layer, above *any* normal DOM node regardless of z-index, so
// a bare `<div>` glow would be invisible for the whole transition.
//
// Replaces `react-theme-switch-animation`, which had two confirmed bugs: a
// perspective/transform hack for large displays that broke its clip-path
// animation in Chrome, and an inconsistent circle origin between browser
// engines. Built directly on the platform API instead of pulling the
// library back in.
export function useThemeToggleAnimation({
  onToggle,
  duration = 2000,
}: UseThemeToggleAnimationOptions) {
  const ref = useRef<HTMLButtonElement>(null);

  const toggleWithAnimation = () => {
    const supportsViewTransition =
      typeof (document as any).startViewTransition === "function";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!ref.current || !supportsViewTransition || prefersReducedMotion) {
      onToggle();
      return;
    }

    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        onToggle();
      });
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            "polygon(0% 0%, 0% 0%, 0% 0%)",
            "polygon(0% 0%, 100% 0%, 0% 100%)",
            "polygon(0% 0%, 200% 0%, 0% 200%)",
          ],
          filter: [
            `drop-shadow(0 0 0px rgba(${GLOW_COLOR}, 0))`,
            `drop-shadow(0 0 36px rgba(${GLOW_COLOR}, 0.55))`,
            `drop-shadow(0 0 8px rgba(${GLOW_COLOR}, 0))`,
          ],
        },
        {
          duration,
          easing: EASE_OUT_EXPO,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return { ref, toggleWithAnimation };
}
