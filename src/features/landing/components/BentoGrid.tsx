import type { ReactNode } from "react";
import { cloneElement, isValidElement } from "react";
import { cn } from "../../../shared/utils/cn";
import { useTheme } from "../../../shared/contexts/ThemeContext";

export function BentoGrid({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 md:auto-rows-[13rem] gap-5", className)}>{children}</div>
  );
}

interface BentoGridItemProps {
  className?: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Featured tile (paired with a md:col-span-2 md:row-span-2 className) - gets
   * a bigger icon and a faded watermark glyph so the extra space reads as
   * intentional rather than empty. */
  large?: boolean;
}

// Adapted from Aceternity UI's Bento Grid (ui.aceternity.com/components/bento-grid):
// per-item col/row spans for the varied "bento" sizing, and a group-hover
// translate on the text - same mechanics, gold glass styling. Content is
// top-anchored (not spread edge-to-edge) so any leftover row height collects
// as calm bottom whitespace inside a card rather than a dead gap between the
// icon and the text.
export function BentoGridItem({ className, title, description, icon, large }: BentoGridItemProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "group/bento relative row-span-1 rounded-[24px] p-6 sm:p-8 flex flex-col overflow-hidden backdrop-blur-[40px] border transition-all duration-300 hover:-translate-y-1",
        isDark
          ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.11] hover:border-[#c9983a]/40"
          : "bg-white/[0.18] border-white/30 hover:bg-white/[0.25] hover:border-[#c9983a]/40",
        // inset, not a regular outer shadow: an outer shadow's blur radius
        // paints past this card's own bottom edge regardless of
        // overflow-hidden (box-shadow is never clipped by the box that
        // casts it) - on the wide 2-col "large" card that bleed showed up
        // as a visible glow through the translucent, backdrop-blurred row
        // of cards sitting just below it in the grid. inset keeps the glow
        // physically inside this card's own box, so it can't bleed onto a
        // neighbor no matter how tight the grid gap is.
        "hover:shadow-[inset_0_0_32px_rgba(201,152,58,0.16)]",
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#c9983a]/10 blur-3xl transition-opacity duration-300 opacity-0 group-hover/bento:opacity-100" />
      {large && isValidElement<{ className?: string }>(icon) && (
        <div className="absolute -bottom-6 -right-6 opacity-[0.07] rotate-[-12deg] pointer-events-none">
          {cloneElement(icon, { className: "w-40 h-40 text-[#c9983a]" })}
        </div>
      )}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-[14px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 shadow-[0_4px_12px_rgba(201,152,58,0.15)]",
          large ? "w-16 h-16 mb-6" : "w-12 h-12 mb-5",
        )}
      >
        {icon}
      </div>
      <div className="relative transition-transform duration-300 group-hover/bento:translate-x-1.5">
        <h3
          className={cn(
            "font-bold mb-2 transition-colors",
            large ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
            isDark ? "text-[#e8dfd0]" : "text-[#2d2820]",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "leading-relaxed transition-colors",
            large ? "text-base max-w-sm" : "text-sm",
            isDark ? "text-[#b8a898]" : "text-[#7a6b5a]",
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
