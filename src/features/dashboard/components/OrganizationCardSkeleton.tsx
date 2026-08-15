import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';

/** Placeholder for OrganizationCard, which is a good deal shorter and
 * centre-aligned compared to ProjectCard - reusing the repo skeleton for the
 * org grid left a tall ghost that collapsed as soon as the orgs arrived.
 * Sized to the real card's laid-out heights; keep the two in sync. */
export function OrganizationCardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex flex-col items-center text-center h-full rounded-[16px] border p-6 ${
        isDark
          ? 'bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)]'
          : 'bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Avatar — w-16 h-16 */}
      <SkeletonLoader variant="default" className="w-16 h-16 rounded-[16px] mb-4" />

      {/* Org name — h4 at text-[16px] => 24px tall */}
      <SkeletonLoader className="h-6 w-28 mb-1" />

      {/* Repository count — text-[12px] => 18px tall */}
      <SkeletonLoader className="h-[18px] w-24 mb-4" />

      {/* Stars / contributors footer */}
      <div
        className={`flex items-center justify-center gap-4 mt-auto pt-4 border-t w-full ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}
      >
        <SkeletonLoader className="h-[18px] w-10" />
        <SkeletonLoader className="h-[18px] w-10" />
      </div>
    </div>
  );
}
