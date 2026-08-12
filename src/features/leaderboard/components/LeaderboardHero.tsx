import { Crown, Trophy, Star } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { GlassCard } from '../../../shared/components/ui/aceternity/GlassCard';
import { GridBackground } from '../../../shared/components/ui/aceternity/GridBackground';
import { LeaderboardType, LeaderboardWindow } from '../types';

interface LeaderboardHeroProps {
  leaderboardType: LeaderboardType;
  isLoaded: boolean;
  /** Which period the board below is showing. Drives the subtitle. */
  activeWindow: LeaderboardWindow;
  children: React.ReactNode;
}

export function LeaderboardHero({ leaderboardType, isLoaded, activeWindow, children }: LeaderboardHeroProps) {
  const { theme } = useTheme();

  return (
    <GlassCard
      tone="solid"
      className={`min-h-[450px] rounded-[28px] overflow-hidden transition-all duration-1000 ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Tier B background: a static grid and two static washes.
          This panel used to run 35 twinkling dots, four pulsing glow blobs and
          three floating rings - 42 persistent animations - all of them inside a
          backdrop-blur surface, which meant the blur was recomputed across the
          whole hero on every frame of every one of them. It is the reason this
          page scrolled worse than any other. The shapes are kept; only the
          motion is gone. See docs/design-system.md. */}
      <GridBackground variant="dots" />
      <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-10 left-10 w-40 h-40 rounded-full blur-[80px]"
          style={{ backgroundColor: 'var(--brand-aurora-1)' }}
        />
        <div
          className="absolute bottom-20 right-1/4 w-36 h-36 rounded-full blur-[70px]"
          style={{ backgroundColor: 'var(--brand-aurora-2)' }}
        />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-10 w-32 h-32 border-2 border-[#c9983a]/15 rounded-full" />
        <div className="absolute top-1/3 right-16 w-24 h-24 border-2 border-[#d4af37]/12 rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-20 h-20 border-2 border-[#c9983a]/15 rounded-full" />
      </div>

      <div className="relative z-10 p-10">
        {/* Title Section with Entrance Animation */}
        <div className={`text-center mb-10 transition-all duration-1000 delay-200 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}>
          <div className="relative inline-block mb-3">
            <h1 className={`text-[44px] font-bold drop-shadow-sm relative z-10 transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>
              {leaderboardType === 'contributors'
                ? activeWindow === 'season' ? 'Seasonal Contributors' : 'All-Time Contributors'
                : 'Top Projects'}
            </h1>
            {/* Golden Underline Animation */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9983a] to-transparent opacity-40" />
          </div>
          
          <div className="relative inline-block">
            {/* In flow on narrow screens, floated above the heading only when
                there is room. Absolutely positioned at every width, it landed
                on top of the title as soon as the title wrapped. */}
            <Crown className="mx-auto mb-1 w-9 h-9 md:w-10 md:h-10 md:absolute md:-top-8 md:left-1/2 md:-translate-x-1/2 md:mb-0 text-[#c9983a] drop-shadow-[0_2px_8px_rgba(201,152,58,0.4)]" />
            <h2 className={`text-[44px] font-bold mb-4 ml-2 pt-4 transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`} style={{ 
              textShadow: '0 2px 8px rgba(201, 152, 58, 0.3), 0 0 20px rgba(201, 152, 58, 0.2)' 
            }}>
              Leaderboard
            </h2>
          </div>
          
          <p className={`text-[14px] max-w-2xl mx-auto leading-relaxed transition-colors ${
            theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#6b5d4d]'
          }`}>
            {leaderboardType === 'contributors' 
              ? "These aren't just contributors—they're the backbone of this project. Raw numbers, real impact. Where do you stand?"
              : "Leading the innovation frontier. These projects are setting the standard. Is yours among them?"}
          </p>
        </div>

        {/* Podium Section — a panel sitting on a panel, so 'raised' rather
            than 'solid' to keep it distinguishable from the hero behind it. */}
        <GlassCard
          tone="raised"
          className={`p-8 max-w-3xl mx-auto transition-all duration-1000 delay-500 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <h3 className={`text-[18px] font-bold transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>
              {leaderboardType === 'contributors' ? 'Most Our Champions' : 'Elite Projects'}
            </h3>
            <Trophy className="w-5 h-5 text-[#c9983a] drop-shadow-sm" />
            <Trophy className="w-5 h-5 text-[#c9983a] drop-shadow-sm" />
            <Trophy className="w-5 h-5 text-[#c9983a] drop-shadow-sm" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-10">
            <Star className="w-4 h-4 text-[#c9983a]" />
            <div className={`text-[13px] font-semibold transition-colors ${
              theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
            }`}>
              {leaderboardType === 'contributors'
                ? activeWindow === 'season' ? 'Merged in the last 90 days' : 'Every merge on record'
                : activeWindow === 'season' ? 'By contributors, last 90 days' : 'By contributors, all time'}
            </div>
            <Star className="w-4 h-4 text-[#c9983a]" />
          </div>

          {children}
        </GlassCard>
      </div>
    </GlassCard>
  );
}
