import { Star, Users, FolderGit2 } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useState } from 'react';
import { motion, type Variants } from 'motion/react';
import { getOnBrandGradient } from '../../../shared/utils/motionVariants';

export interface Organization {
  name: string;
  avatar: string;
  repoCount: number;
  totalStars: number;
  totalContributors: number;
}

interface OrganizationCardProps {
  organization: Organization;
  onClick?: (name: string) => void;
  variants?: Variants;
}

// Same inner-content-card tier as ProjectCard, sized up slightly since an
// org avatar carries more visual weight than a single repo's.
export function OrganizationCard({ organization, onClick, variants }: OrganizationCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [avatarError, setAvatarError] = useState(false);

  const isAvatarUrl = organization.avatar.startsWith('http');
  const showAvatarImage = isAvatarUrl && !avatarError;

  return (
    <motion.div
      variants={variants}
      className={`flex flex-col items-center text-center h-full rounded-[16px] border p-6 transition-all cursor-pointer motion-safe:hover:-translate-y-1 active:scale-[0.98] ${
        isDark
          ? 'bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)] hover:bg-white/[0.12] hover:shadow-[0_8px_24px_rgba(201,152,58,0.15)]'
          : 'bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/[0.2] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
      }`}
      onClick={() => onClick?.(organization.name)}
    >
      {showAvatarImage ? (
        <img
          src={organization.avatar}
          alt={organization.name}
          loading="lazy"
          decoding="async"
          className="w-16 h-16 rounded-[16px] border border-white/20 flex-shrink-0 mb-4"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <div
          className={`w-16 h-16 rounded-[16px] bg-gradient-to-br ${getOnBrandGradient(organization.name)} flex items-center justify-center shadow-md flex-shrink-0 mb-4`}
        >
          <span className="text-white font-bold text-2xl">
            {organization.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <h4 className={`text-[16px] font-bold mb-1 transition-colors ${
        isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
      }`}>{organization.name}</h4>
      <p className={`text-[12px] mb-4 flex items-center gap-1.5 transition-colors ${
        isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'
      }`}>
        <FolderGit2 className="w-3.5 h-3.5" />
        {organization.repoCount} {organization.repoCount === 1 ? 'repository' : 'repositories'}
      </p>

      <div className={`flex items-center justify-center gap-4 text-[12px] mt-auto pt-4 border-t w-full ${
        isDark ? 'border-white/10 text-[#d4d4d4]' : 'border-black/5 text-[#7a6b5a]'
      }`}>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-[#c9983a]" />
          <span>{organization.totalStars}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-[#c9983a]" />
          <span>{organization.totalContributors}</span>
        </div>
      </div>
    </motion.div>
  );
}
