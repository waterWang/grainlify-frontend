import { useEffect, useState } from 'react';
import { Clock, Users, Lock } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

/** Formats a remaining duration as a coarse countdown. Deliberately coarse:
 * a to-the-second timer implies the draw fires at that instant, when it
 * actually runs on the next runner tick within a minute or so. */
export function formatTimeLeft(msRemaining: number): string {
  if (msRemaining <= 0) return 'closed';
  const mins = Math.floor(msRemaining / 60000);
  if (mins < 1) return 'less than a minute';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const rem = mins % 60;
    return rem === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours}h ${rem}m`;
  }
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH === 0 ? `${days} day${days === 1 ? '' : 's'}` : `${days}d ${remH}h`;
}

export type WindowState = 'not_open' | 'open' | 'closed';

export function windowStateOf(opensAt: string | null, closesAt: string | null, now: number): WindowState {
  if (opensAt && now < new Date(opensAt).getTime()) return 'not_open';
  if (closesAt && now >= new Date(closesAt).getTime()) return 'closed';
  return 'open';
}

/** Copy for the coarse bands the backend returns when the exact pool size
 * is deliberately withheld (see applicant_count_visibility). */
const BUCKET_COPY: Record<string, string> = {
  none: 'no applicants yet',
  few: 'a few applicants',
  many: 'many applicants',
};

interface ApplicationWindowProps {
  opensAt: string | null;
  closesAt: string | null;
  /** Exact pool size. Only set when the event publishes it exactly, or once
   * the window has closed and precision can no longer steer anyone. */
  applicantCount?: number | null;
  /** Coarse band, when the exact size is withheld. */
  applicantBucket?: string;
  /** Reserved issues draw only from contributors with no completed
   * GrainHack issues (§3.8), which changes whether it's worth applying. */
  reserved?: boolean;
  compact?: boolean;
}

/** Shows whether an issue is accepting applications, how long is left, and
 * how many people are already in the pool - the three things that decide
 * whether applying now is worth it. */
export function ApplicationWindow({
  opensAt,
  closesAt,
  applicantCount,
  applicantBucket,
  reserved,
  compact = false,
}: ApplicationWindowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Re-render on a timer so the countdown stays honest without a reload.
  // A minute is enough for a coarse readout and costs nothing.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const state = windowStateOf(opensAt, closesAt, now);
  const target = state === 'not_open' ? opensAt : closesAt;
  const remaining = target ? new Date(target).getTime() - now : 0;

  const tone =
    state === 'open'
      ? isDark ? 'text-green-400' : 'text-green-700'
      : isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const label =
    state === 'not_open'
      ? `Applications open in ${formatTimeLeft(remaining)}`
      : state === 'closed'
        ? 'Applications closed - the draw runs shortly'
        : `${formatTimeLeft(remaining)} left to apply`;

  return (
    <div className={`flex items-center gap-3 flex-wrap ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
      <span className={`flex items-center gap-1.5 font-semibold ${tone}`}>
        {state === 'closed' ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
        {label}
      </span>
      {typeof applicantCount === 'number' ? (
        <span className={`flex items-center gap-1.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          <Users className="w-3.5 h-3.5" />
          {applicantCount} {applicantCount === 1 ? 'applicant' : 'applicants'}
        </span>
      ) : applicantBucket && BUCKET_COPY[applicantBucket] ? (
        <span
          title="The exact number is withheld while the window is open, so applying late isn't an advantage."
          className={`flex items-center gap-1.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}
        >
          <Users className="w-3.5 h-3.5" />
          {BUCKET_COPY[applicantBucket]}
        </span>
      ) : null}
      {reserved && (
        <span
          title="Reserved for contributors who haven't completed a GrainHack issue yet"
          className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
            isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700'
          }`}
        >
          Newcomers only
        </span>
      )}
    </div>
  );
}
