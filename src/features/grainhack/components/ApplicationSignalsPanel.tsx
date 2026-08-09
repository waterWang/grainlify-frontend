import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import {
  getHackathonApplicationSignals,
  type HackathonApplicationSignal,
  type HackathonApplicationSignals,
} from '../../../shared/api/client';

const SIGNAL_LABELS: Record<keyof HackathonApplicationSignals, string> = {
  repo_created_at: 'Repo created',
  had_commits_before_announced: 'Had commits before announcement',
  commit_activity_90d: 'Commits (last 90 days)',
  distinct_contributors: 'Distinct contributors',
  prior_grainhack_participation: 'Prior GrainHack participation',
  median_time_to_first_review_hours: 'Median time to first review',
  prior_flagged_associations: 'Prior flagged associations',
};

function formatValue(key: keyof HackathonApplicationSignals, signal: HackathonApplicationSignal): string {
  if (!signal.computed) return signal.note || 'Not available';
  const v = signal.value;
  if (key === 'median_time_to_first_review_hours' && typeof v === 'number') return `${v.toFixed(1)}h`;
  if (key === 'repo_created_at' && typeof v === 'string') return new Date(v).toLocaleDateString();
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length === 0 ? 'None' : `${v.length} prior`;
  return String(v ?? '');
}

interface ApplicationSignalsPanelProps {
  applicationId: string;
}

/** Lazily loads AI-specs.md §2.1's auto-collected signals on first expand,
 * not eagerly for the whole review queue - each computation is several
 * GitHub API calls. */
export function ApplicationSignalsPanel({ applicationId }: ApplicationSignalsPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [signals, setSignals] = useState<HackathonApplicationSignals | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (refresh: boolean) => {
    setIsLoading(true);
    setError(null);
    getHackathonApplicationSignals(applicationId, refresh)
      .then(setSignals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load signals.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-[13px]">
        <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
        <span className={isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}>Loading signals...</span>
      </div>
    );
  }

  if (error || !signals) {
    return <p className={`text-[13px] py-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error || 'No signals available.'}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[12px] font-semibold uppercase tracking-wide ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
          Auto-collected signals
        </span>
        <button
          onClick={() => load(true)}
          className={`p-1.5 rounded-[8px] transition-all ${isDark ? 'hover:bg-white/[0.1] text-[#b8a898]' : 'hover:bg-black/[0.05] text-[#7a6b5a]'}`}
          title="Refresh signals"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {(Object.keys(SIGNAL_LABELS) as (keyof HackathonApplicationSignals)[]).map((key) => (
          <div key={key} className="flex items-center justify-between gap-2 text-[12px]">
            <span className={isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}>{SIGNAL_LABELS[key]}</span>
            <span className={`font-medium text-right ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
              {formatValue(key, signals[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
