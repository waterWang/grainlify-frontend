import { motion } from "motion/react";

interface SpotlightProps {
  className?: string;
}

// Adapted from Aceternity UI's Spotlight (ui.aceternity.com/components/spotlight):
// large, softly-blurred radial gradient blobs positioned diagonally across a
// hero/header area, fading + scaling in on mount - recolored gold to match
// the platform's #c9983a/#d4af37 palette, same layered-ellipse technique.
export function Spotlight({ className = "" }: SpotlightProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute -top-32 left-[8%] w-[560px] h-[560px] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.32) 0%, rgba(212,175,55,0) 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
        className="absolute -top-16 right-[10%] w-[440px] h-[440px] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, rgba(201,152,58,0.28) 0%, rgba(201,152,58,0) 70%)" }}
      />
    </div>
  );
}
