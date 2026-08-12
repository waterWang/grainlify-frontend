import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";

interface FAQItem {
  question: string;
  answer: string;
}

// Grounded in the platform's actual mechanics rather than generic SaaS FAQ
// filler - and in what is true TODAY. Four of these answers previously
// described the points-to-USDC redemption programme, which was retired: there
// are no points to hold, no threshold to clear and no redemption to request.
const FAQS: FAQItem[] = [
  {
    question: "How do I actually get paid for contributing?",
    answer:
      "There is no per-task rate. Accepted work earns a share of a pool, and the pool is divided after the event against rules published before it starts - so what a contribution earns depends on what everyone else contributed. Payouts settle in USDC on Stellar. No event has completed yet, so nothing has been paid out.",
  },
  {
    question: "Why do you need KYC?",
    answer:
      "Because real money will move through the platform. We use a third-party provider (Didit) to verify identity before a first payout, which keeps the reward pool compliant and protects against fraud - it's a one-time step, not something you repeat.",
  },
  {
    question: "I maintain a project - how do I list it?",
    answer:
      "Install the Grainlify GitHub App on your repository from the Maintainers tab. We sync your issues and pull requests automatically, so you can label what's open for contribution and review submissions without leaving your normal GitHub workflow.",
  },
  {
    question: "Do I need any crypto experience to start?",
    answer:
      "No. You sign in with GitHub, apply to issues, and contribute like you normally would. The only place crypto comes in is at payout, when you provide a Stellar wallet address to receive USDC.",
  },
  {
    question: "How is an issue assigned?",
    answer:
      "By a weighted draw, not first-come. Applications open for a fixed window, and when it closes one applicant is drawn. Weight comes from fit for that specific issue, plus a bonus for contributors who have never been assigned one. Your follower count, star count, total pull requests and merge rate are deliberately not counted - they are farmable, and they push newcomers down.",
  },
  {
    question: "Is Grainlify free to use?",
    answer:
      "Yes, for both contributors and maintainers. There's no cost to browse issues, apply, or list a repository. A platform fee can be taken from a sponsor's total before an event's pool is set; the rate and the amount are published on the event's rules page rather than buried.",
  },
];

export function FAQAccordion() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={faq.question}
            className={`rounded-[20px] border backdrop-blur-[30px] overflow-hidden transition-colors ${
              isDark ? "bg-white/[0.06] border-white/12" : "bg-white/[0.15] border-white/25"
            } ${isOpen ? "border-[#c9983a]/40" : ""}`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-7 py-5"
            >
              <span className={`font-semibold text-[15px] sm:text-base transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                {faq.question}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ${
                  isOpen
                    ? "bg-gradient-to-br from-[#c9983a] to-[#d4af37] border-transparent"
                    : isDark
                      ? "border-white/20 text-[#e8dfd0]"
                      : "border-black/15 text-[#2d2820]"
                }`}
              >
                <Plus className={`w-4 h-4 ${isOpen ? "text-white" : ""}`} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className={`px-5 sm:px-7 pb-6 text-sm sm:text-[15px] leading-relaxed transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
