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
