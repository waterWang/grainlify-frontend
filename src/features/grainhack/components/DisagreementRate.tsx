import { useTheme } from '../../../shared/contexts/ThemeContext';
import type { JudgingStats } from '../../../shared/api/client';

interface DisagreementRateProps {
  stats: JudgingStats;
}

/** The cross-check disagreement rate, front and centre on the judging queue.
 *
 * AI-specs.md §5.6 predicts 5-15%. The number is shown against that range
 * because its value is diagnostic, not operational: a rate far above it does
 * not mean the queue is too big or the models are bad, it means two
 * competent judges can't agree - which is a statement about the bucket
 * definitions, most often the accepted/substantial line. The fix in that
 * case is the definitions and the calibration set. Saying so here means
 * nobody has to remember it. */
export function DisagreementRate({ stats }: DisagreementRateProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const rate = stats.disagreement_rate;
  const known = rate != null;
  const aboveExpected = known && rate > stats.expected_range_high;

  const tone = !known
    ? isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
    : aboveExpected
      ? isDark ? 'text-amber-400' : 'text-amber-700'
      : isDark ? 'text-green-400' : 'text-green-700';

  const pairs = Object.entries(stats.disagreement_by_pair ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className={`rounded-[14px] border p-4 ${
        isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.2] border-white/25'
      }`}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
          Cross-check disagreement
        </span>
        <span className={`text-[24px] font-bold tabular-nums ${tone}`}>
          {known ? `${rate.toFixed(1)}%` : 'not yet measured'}
        </span>
        <span className={`text-[12px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
          {known
            ? `${stats.disagreements} of ${stats.both_judged} double-judged · expected ${stats.expected_range_low}–${stats.expected_range_high}%`
            : 'no verdicts have been judged by both providers yet'}
        </span>
      </div>

      {aboveExpected && (
        <p className={`text-[13px] mt-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          Well above the expected range. This is usually a sign that the bucket definitions are ambiguous —
          most often the accepted/substantial line — rather than a problem with the models or the queue size.
          The fix is the definitions and the calibration set.
        </p>
      )}

      {pairs.length > 0 && (
        <div className="mt-3">
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Where they disagree
          </p>
          <div className="flex flex-wrap gap-1.5">
            {pairs.map(([pair, n]) => (
              <span
                key={pair}
                className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums ${
                  isDark ? 'bg-white/[0.08] text-[#d4d4d4]' : 'bg-black/[0.05] text-[#4a3f2f]'
                }`}
              >
                {pair} &times;{n}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
        <span>{stats.total} judged</span>
        <span>{stats.needs_review} need review</span>
        <span>{stats.overridden} overridden</span>
        <span>{stats.prefiltered_out} pre-filtered out</span>
        {stats.injection_flagged > 0 && (
          <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>
            {stats.injection_flagged} flagged for injection
          </span>
        )}
      </div>
    </div>
  );
}
