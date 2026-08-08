import { motion } from "motion/react";
import { CalendarDays, Globe2 } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { ECOSYSTEMS } from "../../../shared/data/ecosystems";

const ORBIT_ANGLES = [-90, 0, 90, 180];

// A hub-and-spoke visual: Grainlify at the center, connected to every chain
// it runs on - a literal picture of "one platform, every network" that
// doubles as the section's own illustration instead of a stock image or logo
// grid.
export function EcosystemNetwork() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section id="ecosystems" className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: orbit visual */}
          <div className="relative h-[340px] sm:h-[400px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" aria-hidden="true">
              {ORBIT_ANGLES.map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x = 200 + Math.cos(rad) * 150;
                const y = 200 + Math.sin(rad) * 150;
                return (
                  <line
                    key={i}
                    x1="200"
                    y1="200"
                    x2={x}
                    y2={y}
                    stroke={isDark ? "rgba(212,175,55,0.35)" : "rgba(166,124,46,0.3)"}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Center hub */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center border-2 backdrop-blur-[30px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] shadow-[0_12px_32px_rgba(201,152,58,0.4)] ${
                isDark ? "border-white/25" : "border-white/50"
              }`}
            >
              <span className="text-white font-bold text-sm sm:text-base">Grainlify</span>
            </motion.div>

            {/* Orbiting ecosystem badges */}
            {ECOSYSTEMS.map((eco, i) => {
              const angle = ORBIT_ANGLES[i % ORBIT_ANGLES.length];
              const rad = (angle * Math.PI) / 180;
              const xPct = 50 + Math.cos(rad) * 37.5;
              const yPct = 50 + Math.sin(rad) * 37.5;
              return (
                <motion.div
                  key={eco.key}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                  className="absolute w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${yPct}%`, left: `${xPct}%` }}
                >
                  <div
                    className={`group relative w-full h-full rounded-full flex flex-col items-center justify-center border backdrop-blur-[20px] bg-gradient-to-br ${eco.gradient} shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition-transform hover:scale-110 ${
                      isDark ? "border-white/20" : "border-white/40"
                    }`}
                  >
                    <span className="text-white font-bold text-[11px] sm:text-xs">{eco.symbol}</span>
                    <span
                      className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark ? "bg-[#1a1512] text-[#e8dfd0]" : "bg-white text-[#2d2820]"
                      } shadow-md`}
                    >
                      {eco.name} · {eco.status === "live" ? "Live" : "Coming Soon"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right: copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-sm font-semibold tracking-wide text-[#c9983a] mb-3 uppercase">
              One Platform, Every Chain
            </span>
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
              Built for a Multi-Chain Future
            </h2>
            <p className={`text-xl mb-10 transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
              Grainlify already connects contributors and maintainers on Stellar and Starknet, with Flare and Solana
              coming soon - one profile, one points balance, no matter which chain your project builds on.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`flex items-start gap-3 rounded-[16px] border p-4 backdrop-blur-[30px] transition-colors ${
                  isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.15] border-white/25"
                }`}
              >
                <Globe2 className="w-5 h-5 text-[#c9983a] flex-shrink-0 mt-0.5" />
                <div>
                  <div className={`font-semibold text-sm mb-1 ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                    Growing Ecosystem
                  </div>
                  <div className={`text-sm ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                    More chains added as the community grows.
                  </div>
                </div>
              </div>
              <div
                className={`flex items-start gap-3 rounded-[16px] border p-4 backdrop-blur-[30px] transition-colors ${
                  isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.15] border-white/25"
                }`}
              >
                <CalendarDays className="w-5 h-5 text-[#c9983a] flex-shrink-0 mt-0.5" />
                <div>
                  <div className={`font-semibold text-sm mb-1 ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                    Monthly Hackathons
                  </div>
                  <div className={`text-sm ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                    Regular events to kickstart new contributions.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
