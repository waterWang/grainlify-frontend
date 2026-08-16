import type { LucideIcon } from 'lucide-react';

/**
 * One item in the sidebar icon rail.
 *
 * Extracted because it did not exist. Every rail item was a branch of a single
 * `.map()` inside Dashboard.tsx, so the only way to add one was to reproduce
 * the styling by hand - which is exactly what happened when the support
 * trigger was added, and it drifted on icon size, idle surface, the inset
 * bevel, hover and active treatment. Correcting that copy would have left the
 * next one to drift the same way.
 *
 * The values here are moved verbatim from that loop, not re-derived. This is a
 * refactor of where the styling lives, not a redesign of it.
 */
export interface RailButtonProps {
  icon: LucideIcon;
  /** Shown in the hover tooltip, and used as the accessible name unless
   *  ariaLabel overrides it. */
  label: string;
  isActive: boolean;
  onClick: () => void;
  /** Reported on hover so the parent can position the portaled tooltip. The
   *  rail clips its own overflow, so the tooltip cannot live inside it. */
  onHover: (position: { label: string; top: number; left: number } | null) => void;
  darkTheme: boolean;
  /** Sets an accessible name. Deliberately NOT defaulted to `label`.
   *
   *  The existing rail items carry no aria-label and are found by data-tour-id;
   *  defaulting one from `label` gave the Admin rail item the name "Admin",
   *  which collided with the ADMIN view-switcher button and broke three tests
   *  that select by that name. That is the same duplicate-label class that
   *  forced the support trigger to be renamed once already.
   *
   *  Labelling the icon-only nav items is worth doing - they have no
   *  accessible name today - but it is an accessibility change with collisions
   *  to resolve, not a side effect of moving styling into a component. */
  ariaLabel?: string;
  tourId?: string;
}

export function RailButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  onHover,
  darkTheme,
  ariaLabel,
  tourId,
}: RailButtonProps) {
  return (
    <button
      type="button"
      data-tour-id={tourId}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onHover({ label, top: rect.top + rect.height / 2, left: rect.right });
      }}
      onMouseLeave={() => onHover(null)}
      onFocus={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onHover({ label, top: rect.top + rect.height / 2, left: rect.right });
      }}
      onBlur={() => onHover(null)}
      className={`group relative w-full flex items-center justify-center px-0 h-[49px] rounded-[12px] backdrop-blur-[40px] transition-all duration-300 ${
        isActive
          ? 'bg-[#c9983a] shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] border-[0.5px] border-[rgba(245,239,235,0.16)]'
          : darkTheme
            ? 'bg-[#2d2820] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] hover:scale-[1.01]'
            : 'bg-[#d4c5b0] shadow-[0px_6px_6.5px_-1px_rgba(0,0,0,0.36),0px_0px_4.2px_0px_rgba(0,0,0,0.69)] hover:scale-[1.01]'
      }`}
    >
      {!isActive && (
        <div
          className={`absolute inset-0 pointer-events-none rounded-[12px] ${
            darkTheme
              ? 'shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.5),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.11)]'
              : 'shadow-[inset_1px_-1px_1px_0px_rgba(0,0,0,0.15),inset_-2px_2px_1px_-1px_rgba(255,255,255,0.35)]'
          }`}
        />
      )}
      <Icon
        className={`w-6 h-6 transition-colors ${
          isActive ? 'text-white' : darkTheme ? 'text-[#e8c77f]' : 'text-[#a2792c]'
        }`}
      />
    </button>
  );
}
