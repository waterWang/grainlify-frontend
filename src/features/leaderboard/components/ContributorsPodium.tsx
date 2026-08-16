import { useState } from 'react';
import { Medal, Trophy, Crown, Sparkles } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { LeaderData } from '../types';

interface ContributorsPodiumProps {
  topThree: LeaderData[];
  isLoaded: boolean;
  actualCount?: number; // Number of actual contributors (not padded)
}

// Avatar URLs sometimes fail to load (network hiccup, deleted account) -
// fall back to the username's initial instead of rendering nothing.
function PodiumAvatarImage({ avatar, username }: { avatar: string; username: string }) {
  const [errored, setErrored] = useState(false);
  if (!avatar.startsWith('http')) {
    return <>{avatar}</>;
  }
  if (errored) {
    return <span>{username.charAt(0).toUpperCase()}</span>;
  }
  return (
    <img
      src={avatar}
      alt={username}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export function ContributorsPodium({ topThree, isLoaded, actualCount }: ContributorsPodiumProps) {
  const { theme } = useTheme();
  
  // Determine how many boxes to show based on actual contributor count
  const showCount = actualCount !== undefined ? Math.min(actualCount, 3) : 3;
  const showSecond = showCount >= 2;
  const showThird = showCount >= 3;

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 mt-8">
      {/* 2nd Place */}
      {showSecond && (
      <div className={`flex flex-col items-center transition-opacity duration-150 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-gradient-to-br from-white/[0.25] to-white/[0.15] border-2 border-white/40 rounded-[18px] p-3 sm:p-5 md:p-6 w-[96px] sm:w-[130px] md:w-[150px] shadow-[0_6px_24px_rgba(0,0,0,0.1)] mb-3 hover:shadow-[inset_0_0_28px_rgba(0,0,0,0.15)] transition-all duration-300 group">
          <div className="relative">
            <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#c9983a]/80 to-[#a67c2e]/70 flex items-center justify-center mx-auto mb-3 border-2 border-white/30 shadow-lg text-2xl group-hover:rotate-12 transition-transform duration-300 overflow-hidden">
              <PodiumAvatarImage avatar={topThree[1].avatar} username={topThree[1].username} />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-[#c9983a] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-center">
            <div className={`text-[14px] font-bold mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>{topThree[1].username}</div>
            <div className="text-[20px] font-black text-[#c9983a]">{topThree[1].score}</div>
            <div className={`text-[11px] transition-colors ${
              theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
            }`}>pts</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-white/[0.2] border border-white/30 rounded-[10px] px-3 py-1.5 shadow-sm animate-slide-up-delayed">
          <Medal className="w-5 h-5 text-[#a89780]" />
          <span className={`text-[16px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>#2</span>
        </div>
      </div>
      )}

      {/* 1st Place */}
      <div className={`flex flex-col items-center -mt-8 transition-opacity duration-150 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="relative bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/20 border-2 border-[#c9983a]/60 rounded-[20px] p-3.5 sm:p-6 md:p-7 w-[112px] sm:w-[148px] md:w-[170px] shadow-[0_8px_32px_rgba(201,152,58,0.35)] mb-3 hover:shadow-[inset_0_0_40px_rgba(201,152,58,0.5)] transition-all duration-300 group">
          {/* Animated Golden Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#c9983a]/10 to-transparent rounded-[20px]" />

          {/* Pulsing Ring */}
          <div className="absolute -inset-3 border-2 border-[#c9983a]/20 rounded-[24px]" />
          
          <div className="relative">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center mx-auto mb-3 border-2 border-[#d4af37] shadow-xl text-3xl overflow-hidden">
              <PodiumAvatarImage avatar={topThree[0].avatar} username={topThree[0].username} />
              {/* Crown on top */}
              <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-6 h-6 text-[#d4af37]" />
            </div>
            <div className="text-center">
              <div className={`text-[15px] font-bold mb-1 transition-colors ${
                theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}>{topThree[0].username}</div>
              <div className="text-[26px] font-black text-[#c9983a]">{topThree[0].score}</div>
              <div className={`text-[11px] transition-colors ${
                theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
              }`}>pts</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-gradient-to-br from-[#c9983a]/40 to-[#d4af37]/30 border-2 border-[#c9983a]/70 rounded-[12px] px-4 py-2 shadow-md animate-slide-up">
          <Trophy className="w-6 h-6 text-[#c9983a]" />
          <span className={`text-[18px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>#1</span>
        </div>
      </div>

      {/* 3rd Place */}
      {showThird && (
      <div className={`flex flex-col items-center transition-opacity duration-150 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="bg-gradient-to-br from-white/[0.25] to-white/[0.15] border-2 border-white/40 rounded-[18px] p-3 sm:p-5 md:p-6 w-[96px] sm:w-[130px] md:w-[150px] shadow-[0_6px_24px_rgba(0,0,0,0.1)] mb-3 hover:shadow-[inset_0_0_28px_rgba(0,0,0,0.15)] transition-all duration-300 group">
          <div className="relative">
            <div className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-[#b89968]/80 to-[#9a7d4f]/70 flex items-center justify-center mx-auto mb-3 border-2 border-white/30 shadow-lg text-2xl group-hover:rotate-12 transition-transform duration-300 overflow-hidden">
              <PodiumAvatarImage avatar={topThree[2].avatar} username={topThree[2].username} />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-[#b89968] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-center">
            <div className={`text-[14px] font-bold mb-1 transition-colors ${
              theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
            }`}>{topThree[2].username}</div>
            <div className="text-[20px] font-black text-[#c9983a]">{topThree[2].score}</div>
            <div className={`text-[11px] transition-colors ${
              theme === 'dark' ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
            }`}>pts</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-white/[0.2] border border-white/30 rounded-[10px] px-3 py-1.5 shadow-sm animate-slide-up-more-delayed">
          <Medal className="w-5 h-5 text-[#b89968]" />
          <span className={`text-[16px] font-bold transition-colors ${
            theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
          }`}>#3</span>
        </div>
      </div>
      )}
    </div>
  );
}