import { useEffect, useState } from 'react';
import { Dices, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { TicketBreakdown } from './TicketBreakdown';
import {
  getHackathonDraws,
  simulateHackathonDraw,
  type HackathonDraw,
  type HackathonDrawResult,
} from '../../../shared/api/client';

interface DrawResultsProps {
  hackathonId: string;
}

/** Admin view of every draw in an event, with each pool's full ticket
 * breakdown.
 *
 * This is the screen to open when a draw produces a result that looks wrong:
 * the seed makes it replayable, and the per-applicant weights show exactly
 * which factors produced the odds. Simulations are included behind a toggle
 * so a weight experiment doesn't get confused with a real assignment. */
export function DrawResults({ hackathonId }: DrawResultsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [draws, setDraws] = useState<HackathonDraw[]>([]);
  const [includeSimulations, setIncludeSimulations] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<HackathonDrawResult | null>(null);

  const load = async (withSims: boolean) => {
    setIsLoading(true);
    try {
      const res = await getHackathonDraws(hackathonId, { include_simulations: withSims });
      setDraws(res.draws);
    } catch (error) {
      console.error('Failed to load draws:', error);
      toast.error('Could not load draws.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(includeSimulations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId, includeSimulations]);

  const handleSimulate = async (issueId: string, seed?: number) => {
    setSimulating(issueId);
    try {
      const res = await simulateHackathonDraw(issueId, seed);
      setSimulation(res);
      toast.success(
        res.winner_user_id
          ? `Simulated: ${res.winner_login} would win.`
          : 'Simulated: no winner from this pool.',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not simulate the draw.');
    } finally {
      setSimulating(null);
    }
  };

  if (isLoading) {
    return <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className={`text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          Every draw stores its seed and the full ticket breakdown, so any result can be replayed and
          explained.
        </p>
        <label className={`flex items-center gap-2 text-[13px] cursor-pointer ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>
          <input
            type="checkbox"
            checked={includeSimulations}
            onChange={(e) => setIncludeSimulations(e.target.checked)}
            className="accent-[#c9983a]"
          />
          Show simulations
        </label>
      </div>

      {simulation && (
        <div className={`rounded-[16px] border p-4 ${isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'}`}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <span className={`text-[13px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
              Simulation &middot; seed {simulation.seed}
              {simulation.winner_login ? ` · ${simulation.winner_login} would win` : ' · no winner'}
            </span>
            <button
              onClick={() => setSimulation(null)}
              className={`text-[12px] ${isDark ? 'text-[#b8a898] hover:text-[#f5f5f5]' : 'text-[#7a6b5a] hover:text-[#2d2820]'}`}
            >
              Dismiss
            </button>
          </div>
          <TicketBreakdown pool={simulation.pool} winnerUserId={simulation.winner_user_id} />
        </div>
      )}

      {draws.length === 0 ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
          No draws yet. They run automatically when an issue's application window closes.
        </div>
      ) : (
        <div className="space-y-2">
          {draws.map((d) => {
            const isExpanded = expanded === d.id;
            return (
              <div
                key={d.id}
                className={`rounded-[16px] border overflow-hidden ${
                  isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 p-4 flex-wrap">
                  <Dices className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
                  <button onClick={() => setExpanded(isExpanded ? null : d.id)} className="flex-1 min-w-0 text-left">
                    <p className={`text-[14px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                      {d.repo_full_name}#{d.issue_number}
                    </p>
                    <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      {d.winner_login ? `${d.winner_login} won` : (d.no_winner_reason || 'no winner')}
                      {' · '}
                      {d.pool_size} in pool
                      {' · '}
                      seed {d.seed}
                      {' · '}
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {d.is_simulation && <Flag label="simulation" isDark={isDark} tone="muted" />}
                    {d.reservation_applied && <Flag label="newcomer-reserved" isDark={isDark} tone="good" />}
                    {d.reservation_fell_back && <Flag label="reservation fell back" isDark={isDark} tone="warn" />}
                    {d.used_weak_pool && <Flag label="weak pool" isDark={isDark} tone="warn" />}
                    {d.first_come_fallback && <Flag label="first-come" isDark={isDark} tone="warn" />}

                    <button
                      onClick={() => handleSimulate(d.hackathon_issue_id, d.seed)}
                      disabled={simulating === d.hackathon_issue_id}
                      title="Re-run this draw with the same seed against the current pool and weights. Writes nothing."
                      className={`p-2 rounded-[10px] transition-all disabled:opacity-50 ${
                        isDark ? 'hover:bg-white/[0.1] text-[#b8a898]' : 'hover:bg-black/[0.05] text-[#7a6b5a]'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : d.id)}
                      className={`p-2 rounded-[10px] transition-all ${
                        isDark ? 'hover:bg-white/[0.1] text-[#b8a898]' : 'hover:bg-black/[0.05] text-[#7a6b5a]'
                      }`}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${isDark ? 'border-white/10' : 'border-white/20'}`}>
                    {d.no_winner_reason && (
                      <p className={`flex items-center gap-2 text-[12px] py-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        {d.no_winner_reason}
                      </p>
                    )}
                    <TicketBreakdown pool={d.pool} winnerUserId={d.winner_user_id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Flag({ label, isDark, tone }: { label: string; isDark: boolean; tone: 'good' | 'warn' | 'muted' }) {
  const cls =
    tone === 'good'
      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700'
      : tone === 'warn'
        ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700'
        : isDark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#7a6b5a]';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
}
