import { useEffect, useState } from 'react';
import { Gavel, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { VerdictDetail } from './VerdictDetail';
import { DisagreementRate } from './DisagreementRate';
import { getHackathonVerdicts, type HackathonVerdict, type JudgingStats } from '../../../shared/api/client';

const FILTERS: { id: string; label: string }[] = [
  { id: 'needs_review', label: 'Needs review' },
  { id: '', label: 'All' },
  { id: 'overridden', label: 'Overridden' },
  { id: 'rejected', label: 'Pre-filtered out' },
];

interface VerdictsReviewProps {
  hackathonId: string;
}

/** The judging review queue. In shadow mode every verdict is reviewed by
 * hand, so "needs review" is the default view rather than an exception. */
export function VerdictsReview({ hackathonId }: VerdictsReviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [verdicts, setVerdicts] = useState<HackathonVerdict[]>([]);
  const [shadowMode, setShadowMode] = useState(true);
  const [stats, setStats] = useState<JudgingStats | null>(null);
  const [filter, setFilter] = useState('needs_review');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (status: string) => {
    setIsLoading(true);
    try {
      const res = await getHackathonVerdicts(hackathonId, status ? { status } : undefined);
      setVerdicts(res.verdicts);
      setShadowMode(res.shadow_mode);
      setStats(res.stats);
    } catch (error) {
      console.error('Failed to load verdicts:', error);
      toast.error('Could not load verdicts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId, filter]);

  return (
    <div className="space-y-4">
      {stats && <DisagreementRate stats={stats} />}

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id || 'all'}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-[10px] text-[13px] font-medium transition-all ${
              filter === f.id
                ? 'bg-[#a2792c] text-white'
                : isDark
                  ? 'text-[#d4c5b0] hover:bg-white/[0.1]'
                  : 'text-[#6b5d4d] hover:bg-white/[0.1]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>
      ) : verdicts.length === 0 ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
          Nothing here. Verdicts appear once merged PRs are judged.
        </div>
      ) : (
        <div className="space-y-2">
          {verdicts.map((v) => {
            const isExpanded = expanded === v.id;
            return (
              <div
                key={v.id}
                className={`rounded-[16px] border overflow-hidden ${
                  isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
                }`}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : v.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <Gavel className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                      {v.repo_full_name}#{v.pr_number}
                    </p>
                    <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      {v.github_login}
                      {v.final_bucket ? ` · ${v.final_bucket}` : ' · no verdict yet'}
                      {v.prefilter_status === 'rejected' && ' · pre-filtered out'}
                    </p>
                  </div>
                  {(v.needs_human_review || v.duplicate_flagged) && (
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  )}
                  {isExpanded ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${isDark ? 'border-white/10' : 'border-white/20'}`}>
                    <div className="pt-4">
                      <VerdictDetail verdict={v} shadowMode={shadowMode} onOverridden={() => load(filter)} />
                    </div>
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
