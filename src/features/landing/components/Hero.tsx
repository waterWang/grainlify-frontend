import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLandingStats } from "../../../shared/hooks/useLandingStats";
import { HoverBorderGradient } from "./HoverBorderGradient";
import { ECOSYSTEMS } from "../../../shared/data/ecosystems";

interface BadgePlacement {
  top: string;
  left: string;
  size: number;
  delay: number;
}

const BADGE_PLACEMENTS: BadgePlacement[] = [
  { top: "18%", left: "10%", size: 72, delay: 0 },
  { top: "22%", left: "86%", size: 64, delay: 1.5 },
  { top: "70%", left: "8%", size: 64, delay: 3 },
  { top: "72%", left: "88%", size: 72, delay: 4.5 },
];

// The chains Grainlify runs on, floating gently behind the hero content -
// each a small glass badge in the platform's own gold palette (not a literal
// brand-logo grid) rather than the earlier flickering-lights treatment.
function FloatingEcosystemBadges({ isDark }: { isDark: boolean }) {
  return (
    <div aria-hidden="true" className="hidden md:block absolute inset-0 overflow-hidden">
      {ECOSYSTEMS.map((eco, i) => {
        const placement = BADGE_PLACEMENTS[i % BADGE_PLACEMENTS.length];
        return (
          <div
            key={eco.key}
            className="animate-float absolute rounded-full"
            style={{
              top: placement.top,
              left: placement.left,
              width: placement.size,
              height: placement.size,
              animationDelay: `${placement.delay}s`,
            }}
          >
            <div
              className={`relative w-full h-full rounded-full flex items-center justify-center border backdrop-blur-[20px] bg-gradient-to-br ${eco.gradient} shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${
                isDark ? "border-white/20" : "border-white/40"
              }`}
            >
              <span className="text-white font-bold text-xs tracking-wide">{eco.symbol}</span>
              <span
                className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ${
                  isDark ? "ring-[#1a1512]" : "ring-[#e8dfd0]"
                } ${eco.status === "live" ? "bg-emerald-400" : "bg-white/50"}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Hero() {
  const { theme } = useTheme();
  const { display } = useLandingStats();

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-20 overflow-hidden">
      {/* Golden Glassmorphism Orbs (hidden on very small screens to avoid overflow) */}
      <div className="hidden sm:block absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full bg-[#c9983a]/30 blur-3xl animate-pulse" />
      <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full bg-[#d4af37]/20 blur-3xl animate-pulse delay-1000" />
      <FloatingEcosystemBadges isDark={theme === "dark"} />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-[30px] border mb-8 transition-colors ${
            theme === "dark"
              ? "bg-white/[0.08] border-white/15"
              : "bg-white/[0.15] border-white/25"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#c9983a]" />
          <span
            className={`text-sm font-medium transition-colors ${
              theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
            }`}
          >
            Web3 Contributors Platform
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight transition-colors ${
            theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
          }`}
        >
          Connect with
          <span className="bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent">
            {" "}
            Open Source
          </span>
          <br />
          Opportunities
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-12 transition-colors ${
            theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
          }`}
        >
          Grainlify bridges the gap between talented contributors and innovative
          projects, making open-source collaboration seamless and rewarding.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mx-auto"
        >
          <HoverBorderGradient
            as={Link}
            to="/signin"
            containerClassName="rounded-[16px] w-full sm:w-auto"
            bgClassName="bg-gradient-to-r from-[#c9983a] to-[#d4af37]"
            className="w-full sm:w-auto flex items-center justify-center gap-2 font-medium group"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </HoverBorderGradient>
          <a
            href="https://grainlify-docs.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-[16px] backdrop-blur-[30px] border font-medium transition-all inline-flex items-center justify-center ${
              theme === "dark"
                ? "bg-white/[0.08] border-white/15 text-[#e8dfd0] hover:bg-white/[0.12] hover:border-[#c9983a]/30"
                : "bg-white/[0.15] border-white/25 text-[#2d2820] hover:bg-white/[0.2] hover:border-[#c9983a]/30"
            }`}
          >
            Docs
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-2"
        >
          {[
            { label: "Active Projects", value: display.activeProjects },
            { label: "Contributors", value: display.contributors },
            { label: "Grants Distributed", value: display.grantsDistributed },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`backdrop-blur-[40px] border rounded-[20px] p-4 sm:p-6 transition-all hover:border-[#c9983a]/30 hover:shadow-[0_12px_36px_rgba(201,152,58,0.15)] hover:-translate-y-0.5 ${
                theme === "dark"
                  ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                  : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
              }`}
            >
              <div
                className={`text-3xl font-bold mb-2 transition-colors ${
                  theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                }`}
              >
                {stat.value}
              </div>
              <div
                className={`transition-colors ${
                  theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                }`}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
