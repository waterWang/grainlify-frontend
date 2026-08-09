import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Github, Linkedin } from "lucide-react";
import { siX, siTelegram } from "simple-icons";
import grainlifyLogo from "../../../assets/grainlify_log.svg";
import { useTheme } from "../../../shared/contexts/ThemeContext";

function SimpleIconGlyph({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const PRODUCT_LINKS: FooterLink[] = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Why Grainlify", href: "#why-choose-us" },
  { label: "FAQ", href: "#faq" },
];

const COMMUNITY_LINKS: FooterLink[] = [
  { label: "Documentation", href: "https://docs.grainlify.com", external: true },
  { label: "GitHub", href: "https://github.com/Grainlify", external: true },
];

const SOCIAL_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  { label: "Grainlify on GitHub", href: "https://github.com/Grainlify", icon: <Github className="w-4 h-4" /> },
  {
    label: "Grainlify on LinkedIn",
    href: "https://www.linkedin.com/company/grainlify",
    icon: <Linkedin className="w-4 h-4" />,
  },
  { label: "Grainlify on X", href: "https://x.com/Grainlify", icon: <SimpleIconGlyph path={siX.path} className="w-4 h-4" /> },
  {
    label: "Grainlify on Telegram",
    href: "https://t.me/+DQ_WdQSwynFiYjZl",
    icon: <SimpleIconGlyph path={siTelegram.path} className="w-4 h-4" />,
  },
];

// Adapted from Aceternity UI's "Footer With Big Text" block
// (ui.aceternity.com/blocks/footers): a huge, faded branded wordmark as the
// closing visual moment, sitting above a conventional link-column + legal bar
// layout - recolored gold-on-glass and given real destinations only (no "#"
// placeholders for pages that don't exist yet).
export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const year = new Date().getFullYear();

  return (
    <footer className="relative pt-20 sm:pt-28 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 pb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-5">
              <img src={grainlifyLogo} alt="Grainlify" className="w-8 h-8 grainlify-logo" />
              <span className={`text-xl font-semibold transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
                Grainlify
              </span>
            </div>
            <p className={`max-w-xs mb-6 transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
              Connecting talent with opportunity in the open-source ecosystem - contribute, get matched, get paid.
            </p>
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full border backdrop-blur-[30px] transition-all ${
                    isDark
                      ? "bg-white/[0.08] border-white/15 text-[#e8dfd0] hover:bg-white/[0.14] hover:border-[#c9983a]/40"
                      : "bg-white/[0.18] border-white/30 text-[#2d2820] hover:bg-white/[0.28] hover:border-[#c9983a]/40"
                  }`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Product" links={PRODUCT_LINKS} isDark={isDark} />
          <FooterColumn title="Community" links={COMMUNITY_LINKS} isDark={isDark} />

          {/* Get started */}
          <div>
            <h4 className={`font-semibold mb-4 transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>
              Get Started
            </h4>
            <div className="space-y-3">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-1.5 font-medium text-[#c9983a] hover:text-[#d4af37] transition-colors"
              >
                Create account
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className={`text-sm transition-colors ${isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"}`}>
                Already have one?{" "}
                <Link to="/signin" className="underline underline-offset-2 hover:text-[#c9983a] transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Legal bar */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t text-sm transition-colors ${
            isDark ? "border-white/10 text-[#8a7c6c]" : "border-black/10 text-[#8a7c6c]"
          }`}
        >
          <p>&copy; {year} Grainlify. All rights reserved.</p>
          <p>Built for the open-source community.</p>
        </div>
      </div>

      {/* Big branded wordmark - purely decorative, receding into the background */}
      <div
        aria-hidden="true"
        className="relative select-none pointer-events-none -mb-[2vw] sm:-mb-[3vw] flex justify-center overflow-hidden"
      >
        <span
          className={`text-[18vw] sm:text-[16vw] leading-none font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b whitespace-nowrap ${
            isDark ? "from-[#c9983a]/25 to-transparent" : "from-[#a67c2e]/20 to-transparent"
          }`}
        >
          GRAINLIFY
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links, isDark }: { title: string; links: FooterLink[]; isDark: boolean }) {
  return (
    <div>
      <h4 className={`font-semibold mb-4 transition-colors ${isDark ? "text-[#e8dfd0]" : "text-[#2d2820]"}`}>{title}</h4>
      <div className="space-y-2.5">
        {links.map((link) => (
          <FooterLinkItem key={link.label} link={link} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

function FooterLinkItem({ link, isDark }: { link: FooterLink; isDark: boolean }) {
  const className = `group flex items-center gap-1 w-fit transition-colors hover:text-[#c9983a] ${
    isDark ? "text-[#b8a898]" : "text-[#7a6b5a]"
  }`;
  const content: ReactNode = (
    <>
      {link.label}
      {link.external && (
        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
      )}
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <a href={link.href} className={className}>
      {content}
    </a>
  );
}
