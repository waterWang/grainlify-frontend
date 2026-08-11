import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';

/** Placeholder for ProjectCard. Every box below is sized to the real card's
 * laid-out height (16px text renders at line-height 1.5, so 24px; 12px at
 * 18px; and so on) - a skeleton that is the wrong height makes the grid jump
 * the moment the data lands. Keep the two in sync when ProjectCard changes. */
export function ProjectCardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex flex-col h-full backdrop-blur-[30px] rounded-[16px] border p-5 ${
        isDark
          ? 'bg-white/[0.08] border-white/15 shadow-[0_4px_16px_rgba(0,0,0,0.24)]'
          : 'bg-white/[0.15] border-white/25 shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Icon — w-11 h-11 */}
      <div className="flex items-start justify-between mb-4">
        <SkeletonLoader variant="default" className="w-11 h-11 rounded-[12px]" />
      </div>

      {/* Title — h4 at text-[16px] => 24px tall */}
      <SkeletonLoader className="h-6 w-3/4 mb-2" />

      {/* Description — line-clamp-2 of text-[12px] => 36px tall */}
      <div className="h-9 mb-4 flex flex-col justify-between">
        <SkeletonLoader className="h-3 w-full" />
        <SkeletonLoader className="h-3 w-5/6" />
      </div>

      {/* Stars and forks — one row of text-[12px] => 18px tall */}
      <div className="flex items-center space-x-3 mb-4">
        <SkeletonLoader className="h-[18px] w-16" />
        <SkeletonLoader className="h-[18px] w-16" />
      </div>

      {/* Stats grid — text-[18px] value (27px) over text-[10px] label (15px) */}
      <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/10">
        {['w-16', 'w-12', 'w-10'].map((labelWidth) => (
          <div key={labelWidth} className="h-[42px] flex flex-col items-center justify-between">
            <SkeletonLoader className="h-6 w-8" />
            <SkeletonLoader className={`h-3 ${labelWidth}`} />
          </div>
        ))}
      </div>

      {/* Tags — px-2.5 py-1 pills around text-[11px] => 26px tall */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        <SkeletonLoader className="h-[26px] w-20 rounded-full" />
        <SkeletonLoader className="h-[26px] w-24 rounded-full" />
        <SkeletonLoader className="h-[26px] w-16 rounded-full" />
      </div>
    </div>
  );
}
