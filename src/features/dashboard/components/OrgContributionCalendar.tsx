import { Sparkles } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import type { OrgCalendarDay } from '../../../shared/api/client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

interface OrgContributionCalendarProps {
  calendar: OrgCalendarDay[];
  total: number;
  isLoading: boolean;
}

// Verbatim port of ProfilePage.tsx's own "Contribution Heatmap" section -
// same hand-built 52x7 CSS grid (not a charting library), same level/color
// mapping, same month-label layout (cosmetic, not date-aligned - see
// ProfilePage.tsx). Only the data source differs: org-aggregated instead of
// per-author.
export function OrgContributionCalendar({ calendar, total, isLoading }: OrgContributionCalendarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const headingText = isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]';
  const mutedText = isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]';

  return (
    <div className={`rounded-[24px] border-2 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.18] border-white/30'}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-[18px] font-bold transition-colors ${headingText}`}>
          {isLoading ? (
            <SkeletonLoader variant="text" width="200px" height="32px" />
          ) : (
            <>
              <span className={`text-[32px] font-black transition-colors ${headingText}`}>{total}</span>
              <span className={`text-[16px] ml-2 transition-colors ${mutedText}`}>contributions last year</span>
            </>
          )}
        </h2>
      </div>

      <div className={`w-full rounded-[20px] border p-6 transition-colors ${isDark ? 'bg-white/[0.05] border-white/15' : 'bg-white/[0.12] border-white/30'}`}>
        {/* Month labels - purely cosmetic spacing, not date-aligned to the
            grid below (matches ProfilePage.tsx's own behavior exactly). */}
        <div className="flex mb-4">
          <div className="w-16" />
          <div className="flex-1 flex justify-between px-1">
            {MONTHS.map((month) => (
              <div key={month} className={`text-[13px] font-bold transition-colors ${headingText}`}>
                {month}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col justify-between py-[3px]">
            {DAY_LABELS.map((label, idx) => (
              <div key={idx} className={`h-[14px] text-[12px] font-bold flex items-center transition-colors ${headingText}`}>
                {label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex-1 flex justify-between gap-[3px]">
              {Array.from({ length: 52 }).map((_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px] flex-1 max-w-[20px]">
                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                    <SkeletonLoader key={dayIdx} variant="default" width="100%" height="100%" className="aspect-square rounded-[4px]" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex justify-between gap-[3px]">
              {Array.from({ length: 52 }).map((_, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px] flex-1 max-w-[20px]">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysAgo = 364 - (weekIdx * 7 + dayIdx);
                    const targetDate = new Date(today);
                    targetDate.setDate(targetDate.getDate() - daysAgo);
                    const dateStr = targetDate.toISOString().split('T')[0];

                    const entry = calendar.find((d) => d.date === dateStr);
                    const count = entry?.count || 0;
                    const level = entry?.level || 0;
                    const hasSparkle = level >= 3 && count > 0;

                    let bgColor = 'bg-white/40 border-2 border-white/60';
                    let shadowClass = 'shadow-[0_2px_8px_rgba(255,255,255,0.3)]';
                    if (level === 1) {
                      bgColor = 'bg-[#c9983a]/50 border-2 border-[#c9983a]/70';
                      shadowClass = 'shadow-[0_2px_10px_rgba(201,152,58,0.3)]';
                    } else if (level === 2) {
                      bgColor = 'bg-[#c9983a]/75 border-2 border-[#c9983a]/90';
                      shadowClass = 'shadow-[0_3px_14px_rgba(201,152,58,0.45)]';
                    } else if (level >= 3) {
                      bgColor = 'bg-gradient-to-br from-[#c9983a] to-[#b8873a] border-2 border-[#ffd700]';
                      shadowClass = 'shadow-[0_4px_20px_rgba(201,152,58,0.6),0_0_15px_rgba(255,215,0,0.4)]';
                    }

                    return (
                      <div
                        key={dayIdx}
                        className={`w-full aspect-square rounded-[4px] ${bgColor} ${shadowClass} hover:scale-125 hover:ring-2 hover:ring-[#c9983a] hover:shadow-[0_4px_24px_rgba(201,152,58,0.8)] hover:z-10 transition-all duration-200 cursor-pointer relative group`}
                        title={count > 0 ? `${count} contribution${count !== 1 ? 's' : ''} on ${dateStr}` : 'No contributions'}
                      >
                        {hasSparkle && (
                          <Sparkles className="w-[10px] h-[10px] text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_rgba(255,255,255,1)] animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 mt-6">
          <span className={`text-[13px] font-bold transition-colors ${mutedText}`}>Less</span>
          <div className="flex items-center gap-2.5">
            <div className="w-[16px] h-[16px] rounded-[4px] bg-white/40 border-2 border-white/60 shadow-[0_2px_8px_rgba(255,255,255,0.3)]" />
            <div className="w-[16px] h-[16px] rounded-[4px] bg-[#c9983a]/50 border-2 border-[#c9983a]/70 shadow-[0_2px_10px_rgba(201,152,58,0.3)]" />
            <div className="w-[16px] h-[16px] rounded-[4px] bg-[#c9983a]/75 border-2 border-[#c9983a]/90 shadow-[0_3px_14px_rgba(201,152,58,0.45)]" />
            <div className="w-[16px] h-[16px] rounded-[4px] bg-gradient-to-br from-[#c9983a] to-[#b8873a] border-2 border-[#ffd700] shadow-[0_4px_20px_rgba(201,152,58,0.6),0_0_15px_rgba(255,215,0,0.4)]" />
          </div>
          <span className={`text-[13px] font-bold transition-colors ${mutedText}`}>More</span>
        </div>
      </div>
    </div>
  );
}
