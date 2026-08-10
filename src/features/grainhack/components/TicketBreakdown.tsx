import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getGitHubAvatarUrl } from '../../../shared/utils/avatar';
import type { HackathonDrawCandidate } from '../../../shared/api/client';

/** Human labels for the §3.9 weight keys the backend emits. Anything not
 * listed falls back to a humanized key, so a new weight shows up readably
 * without a frontend change. */
const WEIGHT_LABELS: Record<string, string> = {
  fit_strong: 'Strong fit',
  fit_plausible: 'Plausible fit',
  fit_weak: 'Weak fit',
  difficulty_above: 'Issue above demonstrated level',
  prior_completion: 'Prior completions',
  first_ever_application: 'First-ever application',
  per_abandon: 'Prior abandons',
  first_come_fallback: 'First-come fallback',
};

function humanizeWeight(key: string): string {
  return (
    WEIGHT_LABELS[key] ??
    key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
}

interface TicketBreakdownProps {
  pool: HackathonDrawCandidate[];
  winnerUserId?: string | null;
  /** Highlights one row - used on the contributor-facing view so someone
   * can find themselves in a pool of thirty without reading every line. */
  highlightUserId?: string | null;
}

/** The pool of a single draw, as a ranked ticket table.
 *
 * This is the artifact that makes "why didn't I get it" answerable: it shows
 * every applicant's odds and, per applicant, exactly which §3.9 factors
 * produced them. A single ticket number can't answer that question, which
 * is why the backend stores the per-factor breakdown rather than the
 * product alone. */
export function TicketBreakdown({ pool, winnerUserId, highlightUserId }: TicketBreakdownProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (pool.length === 0) {
    return (
      <p className={`text-[13px] py-3 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
        Nobody was in this pool.
      </p>
    );
  }

  const total = pool.reduce((sum, c) => sum + c.tickets, 0);
  // Ranked by odds, so the table reads the way the question is asked.
  const ranked = [...pool].sort((a, b) => b.tickets - a.tickets);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            <th className="py-2 pr-3 font-semibold">Applicant</th>
            <th className="py-2 pr-3 font-semibold">Why</th>
            <th className="py-2 pr-3 font-semibold text-right whitespace-nowrap">Tickets</th>
            <th className="py-2 font-semibold text-right whitespace-nowrap">Odds</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((c) => {
            const isWinner = winnerUserId != null && c.user_id === winnerUserId;
            const isYou = highlightUserId != null && c.user_id === highlightUserId;
            const odds = total > 0 ? (100 * c.tickets) / total : 0;
            return (
              <tr
                key={c.user_id}
                className={`border-t align-top ${isDark ? 'border-white/10' : 'border-black/10'} ${
                  isWinner ? (isDark ? 'bg-[#c9983a]/[0.12]' : 'bg-[#c9983a]/[0.10]') : ''
                } ${isYou && !isWinner ? (isDark ? 'bg-white/[0.05]' : 'bg-black/[0.03]') : ''}`}
              >
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={getGitHubAvatarUrl(c.github_login, 24)}
                      alt=""
                      className="w-6 h-6 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <span className={`text-[13px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                        {c.github_login}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isWinner && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#c9983a]/25 text-[#8b6f3a] dark:text-[#e8c571]">
                            Won
                          </span>
                        )}
                        {isYou && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]'}`}>
                            You
                          </span>
                        )}
                        {c.is_newcomer && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700'}`}>
                            Newcomer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(c.weights).map(([key, factor]) => (
                      <span
                        key={key}
                        title={`${humanizeWeight(key)}: x${factor}`}
                        className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap ${
                          factor >= 1
                            ? isDark ? 'bg-white/[0.08] text-[#d4d4d4]' : 'bg-black/[0.05] text-[#4a3f2f]'
                            : isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-500/10 text-red-700'
                        }`}
                      >
                        {humanizeWeight(key)} &times;{factor}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={`py-2.5 pr-3 text-right tabular-nums text-[13px] ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                  {c.tickets.toFixed(3)}
                </td>
                <td className={`py-2.5 text-right tabular-nums text-[13px] font-semibold ${isDark ? 'text-[#e8c571]' : 'text-[#8b6f3a]'}`}>
                  {odds.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
