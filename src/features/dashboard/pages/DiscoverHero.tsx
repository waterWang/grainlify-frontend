import { CheckCircle2, CreditCard, ShieldCheck, Sparkles, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { AuroraBackground } from "../../../shared/components/ui/aceternity/AuroraBackground";
import { GridBackground } from "../../../shared/components/ui/aceternity/GridBackground";

interface DiscoverHeroProps {
  login?: string;
  avatarUrl?: string;
  /** True until we know the user's real billing/KYC status — the setup card stays
   * hidden during this window instead of flashing "incomplete" then disappearing. */
  isLoadingStatus: boolean;
  hasBillingProfile: boolean;
  kycVerified: boolean;
  onGoToBilling?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DiscoverHero({
  login,
  avatarUrl,
  isLoadingStatus,
  hasBillingProfile,
  kycVerified,
  onGoToBilling,
}: DiscoverHeroProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const prefersReducedMotion = useReducedMotion();
  const setupComplete = hasBillingProfile && kycVerified;
  const currentStep = !hasBillingProfile ? 1 : 2;

  const steps = [
    { n: 1, label: "Billing profile", icon: CreditCard, done: hasBillingProfile },
    { n: 2, label: "Verify KYC", icon: ShieldCheck, done: kycVerified },
  ];

  return (
    <>
      {/* Welcome — an aurora panel rather than a bare row. Still compact: this
          is seen after every login, not just the first, so it earns a band of
          the screen, not a full one. */}
      <AuroraBackground
        className={`rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-[40px] transition-colors ${
          isDark ? "bg-white/[0.06] border-white/10" : "bg-white/[0.14] border-white/25"
        }`}
      >
        <GridBackground variant="dots" />
        <div className="relative z-10 flex items-center gap-4 px-5 md:px-8 py-6 md:py-8">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={login || "Your avatar"}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-[#c9983a]/50 flex-shrink-0 shadow-[0_4px_16px_rgba(162,121,44,0.25)]"
            />
          ) : (
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-bold text-lg border-2 border-[#c9983a]/50 shadow-[0_4px_16px_rgba(162,121,44,0.25)]">
              {(login || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            {/* No `truncate`: at the larger size this clipped the user's own
                name to "Good morning, j…" on a 390px screen. It wraps instead. */}
            <h1 className={`text-xl sm:text-2xl md:text-[34px] font-bold leading-tight tracking-[-0.01em] break-words transition-colors ${isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}>
              {getGreeting()}
              {login ? (
                <>
                  ,{" "}
                  <span className="bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent">
                    {login}
                  </span>
                </>
              ) : (
                ""
              )}
            </h1>
            <p className={`text-[13px] md:text-[15px] mt-0.5 transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
              Here's what's matched to you today.
            </p>
          </div>
        </div>
      </AuroraBackground>

      {/* Setup nudge — only while something's actually incomplete; disappears for good
          once billing + KYC are both done, handing this space back to real content. */}
      {!isLoadingStatus && !setupComplete && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`relative overflow-hidden backdrop-blur-[40px] rounded-[20px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
            isDark ? "bg-white/[0.08] border-white/10" : "bg-white/[0.12] border-white/20"
          }`}
        >
          <div className="absolute -top-16 -right-16 w-[220px] h-[220px] rounded-full bg-[#c9983a]/20 blur-[80px] pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-5 md:px-7 py-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-[#c9983a] flex-shrink-0" />
                <h2 className={`text-[15px] md:text-base font-bold transition-colors ${isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"}`}>
                  Finish setup to get matched
                </h2>
              </div>
              <p className={`text-[13px] md:text-[13.5px] mb-3 transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                Add your billing profile and verify your KYC so we can route rewards on-chain.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {steps.map((step) => (
                  <div key={step.n} className="flex items-center gap-1.5">
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
                    ) : (
                      <step.icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          step.n === currentStep ? "text-[#c9983a]" : isDark ? "text-[#6b5f52]" : "text-[#b8a898]"
                        }`}
                      />
                    )}
                    <span
                      className={`text-[12.5px] font-semibold transition-colors ${
                        step.done
                          ? isDark ? "text-[#d4d4d4] line-through decoration-[#4ade80]/60" : "text-[#7a6b5a] line-through decoration-[#4ade80]/60"
                          : step.n === currentStep
                            ? isDark ? "text-[#f5f5f5]" : "text-[#2d2820]"
                            : isDark ? "text-[#6b5f52]" : "text-[#b8a898]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onGoToBilling}
              disabled={!onGoToBilling}
              // min-h-[44px] rather than more padding: the button is already
              // the right shape, it was just 42px tall - two short of the
              // 44x44 minimum, on the primary call to action of the page.
              className={`flex-shrink-0 px-5 py-2.5 min-h-[44px] rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13.5px] shadow-[0_4px_14px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.45)] transition-all inline-flex items-center justify-center gap-1.5 border border-white/10 ${
                !onGoToBilling ? "opacity-70 cursor-default" : ""
              }`}
            >
              <span>{hasBillingProfile ? "Verify KYC" : "Continue setup"}</span>
              <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}
