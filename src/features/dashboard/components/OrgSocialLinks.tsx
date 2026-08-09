import { Github } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import type { OrgLinks } from '../../../shared/api/client';

// Icon paths + active/inactive chrome ported from ProfilePage.tsx's own
// social links row (same platforms minus the KYC shield, which has no
// org-level equivalent in this schema). GitHub is always active/derived
// from the org login, exactly like ProfilePage.tsx never gives it an
// inactive state either.
const TELEGRAM_PATH =
  'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';
const LINKEDIN_PATH =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z';
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const TWITTER_PATH =
  'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z';
const DISCORD_PATH =
  'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.958a.076.076 0 0 0-.041-.039 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.039c.36.663.772 1.33 1.225 1.958a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z';

function SocialLinkIcon({ href, title, path, isDark }: { href: string | null; title: string; path: string; isDark: boolean }) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 flex items-center justify-center hover:shadow-[0_4px_12px_rgba(201,152,58,0.4)] transition-all duration-300"
        title={title}
      >
        <svg className="w-4 h-4" fill="#c9983a" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d={path} />
        </svg>
      </a>
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-not-allowed ${
        isDark
          ? 'bg-gradient-to-br from-gray-400/20 to-gray-500/10 border-gray-400/30 opacity-40'
          : 'bg-gradient-to-br from-gray-300/40 to-gray-400/30 border-gray-400/50 opacity-60'
      }`}
      title={title}
    >
      <svg className={`w-4 h-4 ${isDark ? 'fill-[#9ca3af]' : 'fill-[#6b7280]'}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d={path} />
      </svg>
    </div>
  );
}

export function OrgSocialLinks({ orgLogin, links }: { orgLogin: string; links: OrgLinks | null }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <a
        href={`https://github.com/${orgLogin}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/50 flex items-center justify-center hover:shadow-[0_4px_12px_rgba(201,152,58,0.4)] transition-all duration-300"
        title="GitHub"
      >
        <Github className="w-4 h-4 text-[#c9983a]" />
      </a>

      <SocialLinkIcon
        href={links?.telegram ? `https://t.me/${links.telegram.replace(/^@/, '')}` : null}
        title="Telegram"
        path={TELEGRAM_PATH}
        isDark={isDark}
      />
      <SocialLinkIcon
        // Company pages use /company/, not /in/ (that's the personal-profile
        // path) - the one deliberate deviation from ProfilePage.tsx's own
        // per-user formula.
        href={
          links?.linkedin
            ? links.linkedin.startsWith('http')
              ? links.linkedin
              : `https://www.linkedin.com/company/${links.linkedin.replace(/^@/, '')}`
            : null
        }
        title="LinkedIn"
        path={LINKEDIN_PATH}
        isDark={isDark}
      />
      <SocialLinkIcon
        href={links?.whatsapp ? `https://wa.me/${links.whatsapp.replace(/[^0-9]/g, '')}` : null}
        title="WhatsApp"
        path={WHATSAPP_PATH}
        isDark={isDark}
      />
      <SocialLinkIcon
        href={links?.twitter ? `https://twitter.com/${links.twitter.replace(/^@/, '')}` : null}
        title="Twitter"
        path={TWITTER_PATH}
        isDark={isDark}
      />
      <SocialLinkIcon
        // A server invite code (discord.gg/xxx), not a per-user handle - no
        // sensible bare-handle construction exists, so this always expects
        // either a full pasted URL or a bare invite code.
        href={
          links?.discord
            ? links.discord.startsWith('http')
              ? links.discord
              : `https://discord.gg/${links.discord.replace(/^@/, '')}`
            : null
        }
        title="Discord"
        path={DISCORD_PATH}
        isDark={isDark}
      />
    </div>
  );
}
