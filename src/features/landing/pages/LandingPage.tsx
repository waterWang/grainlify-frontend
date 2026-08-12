import type { ReactNode } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { EcosystemNetwork } from "../components/EcosystemNetwork";
import { BentoGrid, BentoGridItem } from "../components/BentoGrid";
import { FAQAccordion } from "../components/FAQAccordion";
import { Footer } from "../components/Footer";
import { motion } from "motion/react";
import {
  Code,
  GitBranch,
  Award,
  Shield,
  Zap,
  Users,
  TrendingUp,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { useLandingStats } from "../../../shared/hooks/useLandingStats";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Check for OAuth callback token in URL (fallback for wrong redirect URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const github = params.get("github");

    console.log("LandingPage - Checking for token in URL");
    console.log("LandingPage - Current URL:", window.location.href);
    console.log("LandingPage - Token found:", token ? "Yes" : "No");
    console.log("LandingPage - GitHub username:", github);

    if (token) {
      console.log("LandingPage - Redirecting to /auth/callback with token");
      // If there's a token in the URL, redirect to the proper callback handler
      navigate(`/auth/callback?token=${token}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div
      className={`min-h-screen transition-colors ${
        theme === "dark"
          ? "bg-gradient-to-br from-[#1a1512] via-[#231c17] to-[#2d241d]"
          : "bg-gradient-to-br from-[#e8dfd0] via-[#d4c5b0] to-[#c9b89a]"
      }`}
    >
      <Navbar />
      <Hero />
      <Mechanism />
      <BuiltAndPlanned />
      <EcosystemNetwork />
      <Features />
      <HowItWorks />
      <WhyChooseUs />
      <FAQ />
      <Footer />
    </div>
  );
}

// Fades a section into view once as the user scrolls to it - applied
// consistently across every section below for a cohesive, alive-feeling page.
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle: string }) {
  const { theme } = useTheme();
  return (
    <Reveal className="text-center mb-16">
      {eyebrow && (
        <span className="inline-block text-sm font-semibold tracking-wide text-[#c9983a] mb-3 uppercase">
          {eyebrow}
        </span>
      )}
      <h2
        className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
          theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
        }`}
      >
        {title}
      </h2>
      <p
        className={`text-xl max-w-2xl mx-auto transition-colors ${
          theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
        }`}
      >
        {subtitle}
      </p>
    </Reveal>
  );
}

function Features() {
  const features = [
    {
      icon: Code,
      // No AI matches anyone. Assignment is a weighted draw computed by the
      // backend; the AI stages sit behind ai_judging_enabled, which is false.
      title: "Assignment by Weighted Draw",
      description:
        "Applications open for a fixed window, then one applicant is drawn. Weight comes from fit for that specific issue - not from how fast you applied.",
      className: "md:col-span-2 md:row-span-2",
      large: true,
    },
    {
      icon: GitBranch,
      title: "Seamless Integration",
      description:
        "Connect your GitHub, track contributions, and manage everything in one place.",
    },
    {
      icon: Award,
      title: "Rewards & Recognition",
      description:
        "Get compensated for your contributions with transparent grant distribution.",
    },
    {
      icon: Shield,
      // Not "near-instant USDC payouts": nothing sends USDC yet. There is no
      // funded treasury account, and the escrow contract is not deployed.
      title: "Published Rules",
      description:
        "Every draw weight, cap, gate and curve is public before an event starts, served from the same values the backend enforces.",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description:
        "Stay informed with instant notifications about project updates and opportunities.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description:
        "Join a thriving community of developers, maintainers, and open-source enthusiasts.",
    },
  ];

  return (
    <section id="features" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Platform"
          title="Everything You Need to Succeed"
          subtitle="Powerful features designed to streamline your open-source journey"
        />

        <Reveal delay={0.1}>
          <BentoGrid>
            {features.map((feature) => (
              <BentoGridItem
                key={feature.title}
                title={feature.title}
                description={feature.description}
                className={feature.className}
                large={feature.large}
                icon={<feature.icon className="w-6 h-6 text-[#c9983a]" />}
              />
            ))}
          </BentoGrid>
        </Reveal>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { theme } = useTheme();

  const steps = [
    {
      number: "01",
      title: "Create Your Profile",
      description:
        "Sign up and showcase your skills, interests, and open-source experience.",
    },
    {
      number: "02",
      title: "Discover Projects",
      description:
        "Browse through curated projects or get matched with opportunities that fit you.",
    },
    {
      number: "03",
      title: "Start Contributing",
      description:
        "Connect with maintainers, pick up tasks, and start making an impact.",
    },
    {
      number: "04",
      // The points programme was retired and the Redeem page removed, so
      // there is no threshold to clear and nothing to redeem.
      title: "Share the Pool",
      description:
        "Accepted work earns a share of the event pool, decided after the event against published rules.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Process"
          title="How It Works"
          subtitle="Get started in four simple steps"
        />

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.1} className="relative">
              {/* Connector Line (desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#c9983a]/50 to-transparent" />
              )}

              <div
                className={`h-full backdrop-blur-[40px] border rounded-[24px] p-8 transition-all hover:border-[#c9983a]/30 hover:shadow-[0_12px_36px_rgba(201,152,58,0.15)] hover:-translate-y-1 ${
                  theme === "dark"
                    ? "bg-white/[0.08] border-white/15 hover:bg-white/[0.12]"
                    : "bg-white/[0.15] border-white/25 hover:bg-white/[0.2]"
                }`}
              >
                <div className="text-6xl font-bold bg-gradient-to-r from-[#c9983a] to-[#d4af37] bg-clip-text text-transparent mb-6">
                  {step.number}
                </div>
                <h3
                  className={`text-2xl font-semibold mb-4 transition-colors ${
                    theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`transition-colors ${
                    theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const { theme } = useTheme();
  const { display } = useLandingStats();

  const benefits = [
    "Verified and vetted projects from trusted organizations",
    "Fair compensation with transparent grant distribution",
    "Comprehensive skill development and mentorship",
    "Active community support and collaboration",
    "Real-time project tracking and analytics",
    "Secure Stellar-based USDC payouts",
  ];

  return (
    <section id="why-choose-us" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Benefits */}
          <Reveal>
            <h2
              className={`text-4xl md:text-5xl font-bold mb-6 transition-colors ${
                theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
              }`}
            >
              Why Choose Grainlify?
            </h2>
            <p
              className={`text-xl mb-10 transition-colors ${
                theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            >
              We're more than just a platform – we're your partner in
              open-source success.
            </p>

            <div className="space-y-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center mt-1 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <p
                    className={`transition-colors ${
                      theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                    }`}
                  >
                    {benefit}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center space-x-8">
              <div>
                <div
                  className={`text-4xl font-bold transition-colors ${
                    theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                  }`}
                >
                  98%
                </div>
                <div
                  className={`transition-colors ${
                    theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                  }`}
                >
                  Satisfaction Rate
                </div>
              </div>
              <div>
                <div
                  className={`text-4xl font-bold transition-colors ${
                    theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                  }`}
                >
                  24/7
                </div>
                <div
                  className={`transition-colors ${
                    theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                  }`}
                >
                  Support Available
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: Visual Element */}
          <Reveal delay={0.15} className="relative">
            <div
              className={`backdrop-blur-[40px] border rounded-[28px] p-8 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] ${
                theme === "dark"
                  ? "bg-white/[0.08] border-white/15"
                  : "bg-white/[0.15] border-white/25"
              }`}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9983a]/20 rounded-full blur-3xl" />
              <div className="relative space-y-6">
                {[
                  {
                    icon: TrendingUp,
                    label: "Growing Ecosystem",
                    value: "+45%",
                  },
                  {
                    icon: Users,
                    label: "Active Users",
                    value: display.contributors,
                  },
                  {
                    icon: Award,
                    label: "Projects Funded",
                    value: display.activeProjects,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center space-x-4 backdrop-blur-[25px] border rounded-[16px] p-4 transition-all hover:border-[#c9983a]/30 ${
                      theme === "dark"
                        ? "bg-white/[0.06] border-white/10 hover:bg-white/[0.1]"
                        : "bg-white/[0.12] border-white/20 hover:bg-white/[0.18]"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-[12px] bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/30 flex items-center justify-center shadow-[0_4px_12px_rgba(201,152,58,0.15)]">
                      <item.icon className="w-6 h-6 text-[#c9983a]" />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm transition-colors ${
                          theme === "dark" ? "text-[#b8a898]" : "text-[#7a6b5a]"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div
                        className={`text-xl font-semibold transition-colors ${
                          theme === "dark" ? "text-[#e8dfd0]" : "text-[#2d2820]"
                        }`}
                      >
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}


function FAQ() {
  return (
    <section id="faq" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about contributing and getting paid"
        />

        <Reveal delay={0.1}>
          <FAQAccordion />
        </Reveal>
      </div>
    </section>
  );
}

// ============================================================================
// The mechanism sections. These exist because the thing that distinguishes
// Grainlify from a bounty board is how work is allocated and priced, not the
// feature list - and a reader who cannot see the mechanism in the first
// screenful assumes there isn't one.
//
// Every claim below is enforced somewhere: draw weights in
// internal/hackathon/draw.go, the diminishing curve and floor in the published
// rule set, and the built/planned split against the on-chain spec's own
// as-built record. Nothing here describes something that only runs in a test.
// ============================================================================

const MECHANISM = [
  {
    title: "Issues are drawn, not claimed",
    body:
      "Applications open for a fixed window. When it closes, one applicant is drawn - weighted, not random. Weight comes from fit for that specific issue, not from your follower count, your merge rate, or your overall history. Those are deliberately not counted: they're farmable, and they push newcomers down. First-time applicants carry a 1.5x bonus until they win something, and prior wins stop compounding after two, so having won before can never outrank being right for the issue in front of you.",
  },
  {
    title: "Rewards are retroactive and quality-gated",
    body:
      "There's no rate card. A pool is split after the event among accepted work, so what a pull request earns depends on what everyone else contributed. Each additional accepted PR is worth progressively less down a published curve. You cannot work out a specific PR's multiplier while the event runs, because it depends on how many you end up getting accepted - which nobody knows until the event closes. A reward that can't be calculated in advance can't be farmed.",
  },
  {
    title: "Published in full, and safe to publish",
    body:
      "Every draw weight, cap, gate and curve is public before an event starts - the entire rule set is served from the same constants the backend enforces. That's only safe because knowing the rules doesn't help you beat them: there's no queue to be first in, no metric to inflate, and no payout to precompute. Transparency without exploitability is the design, not a policy.",
  },
];

function Mechanism() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return (
    <section id="mechanism" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="How it allocates"
          title="Why this isn't another bounty board"
          subtitle="Three mechanisms, all of them published before an event starts"
        />
        <div className="space-y-5">
          {MECHANISM.map((item, i) => (
            <Reveal key={item.title} delay={0.05 * i}>
              <div
                className={`rounded-[20px] border p-6 sm:p-8 backdrop-blur-[30px] transition-colors ${
                  dark
                    ? "bg-white/[0.06] border-white/10"
                    : "bg-white/[0.15] border-white/25"
                }`}
              >
                <h3
                  className={`text-xl sm:text-2xl font-bold mb-3 transition-colors ${
                    dark ? "text-[#e8dfd0]" : "text-[#2d2820]"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`text-[15px] leading-relaxed transition-colors ${
                    dark ? "text-[#b8a898]" : "text-[#7a6b5a]"
                  }`}
                >
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// The split is the point. Blurring built and planned is how a reviewer who
// checks one claim stops believing the rest, so these are two visibly separate
// columns and never one merged list.
//
// Wording is deliberate in two places. The escrow layer is an interface plus a
// registry plus dispatch plus Merkle primitives, tested against an in-memory
// adapter - there is exactly one ChainAdapter implementation and it is a mock,
// so "with adapters" would overstate it. Referral attribution is shipped and
// enforced server-side, but no referral has ever completed in production, so it
// is not described as live.
const BUILT = [
  "Weighted-draw assignment with published weights - 102 parameters live at /grainhack/rules",
  "Leaderboard scored on verified merged pull requests",
  "Chain-agnostic escrow layer: adapter interface, registry, all-or-nothing multi-chain dispatch and Merkle claim primitives, tested against an in-memory adapter",
  "Soroban escrow contract: pools, commitments, pull-based Merkle claims, timelocked sweep - 18 passing tests",
  "Role-based admin access, server-verified on every request",
  "Referral attribution shipped and server-enforced, with a signed 30-day window - not yet exercised end to end in production",
];

const PLANNED = [
  "Soroban testnet deployment, then mainnet",
  "External audit before mainnet funds",
  "AI-assisted evidence gathering for judging - humans decide, with appeals",
  "First GrainHack event",
];

function BuiltAndPlanned() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const column = (
    title: string,
    items: string[],
    tone: "built" | "planned",
  ) => (
    <div
      className={`rounded-[20px] border p-6 sm:p-8 backdrop-blur-[30px] transition-colors ${
        dark ? "bg-white/[0.06] border-white/10" : "bg-white/[0.15] border-white/25"
      }`}
    >
      <h3
        className={`text-lg font-bold mb-5 transition-colors ${
          dark ? "text-[#e8dfd0]" : "text-[#2d2820]"
        }`}
      >
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === "built" ? "bg-[#c9983a]" : dark ? "bg-white/25" : "bg-black/20"
              }`}
            />
            <span
              className={`text-[14px] leading-relaxed transition-colors ${
                dark ? "text-[#b8a898]" : "text-[#7a6b5a]"
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <section id="status" className="relative py-20 sm:py-24 md:py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="Status"
          title="Built, and planned"
          subtitle="Kept separate on purpose - every line on the left is something you can check"
        />
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal>{column("Built and running today", BUILT, "built")}</Reveal>
          <Reveal delay={0.05}>{column("Planned", PLANNED, "planned")}</Reveal>
        </div>

        <Reveal delay={0.1}>
          <p
            className={`mt-8 text-[14px] leading-relaxed max-w-3xl mx-auto text-center transition-colors ${
              dark ? "text-[#b8a898]" : "text-[#7a6b5a]"
            }`}
          >
            No event has run yet. Draws today are executed by the backend and
            recorded, not yet anchored on-chain - commit-reveal and Merkle claims
            are written and tested, and are not yet wired to a live chain. We'd
            rather say that than imply otherwise.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {VERIFY_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2.5 rounded-[12px] border text-[13px] font-medium backdrop-blur-[30px] transition-all ${
                  dark
                    ? "bg-white/[0.06] border-white/10 text-[#e8dfd0] hover:border-[#c9983a]/40"
                    : "bg-white/[0.15] border-white/25 text-[#2d2820] hover:border-[#c9983a]/40"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// Verify it yourself. Every one of these is public and was checked to return
// something real - a link that 404s on a page about not overstating is worse
// than no link. The Soroban contract is deliberately absent: it lives in a
// local repository with no remote, so there is nothing to point a reviewer at
// until it is published.
const VERIFY_LINKS = [
  { label: "The rule set, as the API serves it", href: "https://api.grainlify.com/grainhack/rules" },
  { label: "How assignment works", href: "https://docs.grainlify.com/docs/contributors/grainhack" },
  { label: "The leaderboard", href: "https://api.grainlify.com/leaderboard" },
  { label: "Backend source", href: "https://github.com/Grainlify/Grainlify-Backend" },
  { label: "Frontend source", href: "https://github.com/Grainlify/Grainlify-Frontend" },
];
