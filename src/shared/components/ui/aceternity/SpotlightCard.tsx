import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../../utils/cn';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Aceternity's card spotlight: a soft highlight that follows the cursor.
 *
 * Two changes from upstream, both for cost.
 *
 * Upstream stores the pointer position in React state, so every mousemove over
 * the card triggers a render of the card and its whole subtree. On a grid of
 * eight project cards that is a render storm for a lighting effect. This writes
 * the position to CSS custom properties on the DOM node instead, so moving the
 * cursor never re-renders React at all. The only state here is a boolean for
 * whether the pointer is inside, which changes twice per hover.
 *
 * Upstream also renders the highlight always; this mounts it only while hovered
 * and skips the whole mechanism when the user prefers reduced motion, in which
 * case the card is a plain container.
 *
 * The highlight colour is --brand-spotlight (styles/brand.css), so this holds
 * no colour of its own and needs no theme conditional.
 */
export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
    node.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
  };

  if (prefersReducedMotion) {
    return <div className={cn('relative', className)}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative group/spotlight', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background:
            'radial-gradient(320px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), var(--brand-spotlight), transparent 70%)',
        }}
      />
      {children}
    </div>
  );
}
