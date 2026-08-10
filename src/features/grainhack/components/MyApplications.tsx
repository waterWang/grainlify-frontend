import { useEffect, useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ApplicationWindow } from './ApplicationWindow';
import {
  getMyHackathonIssueApplications,
  type HackathonIssueApplication,
} from '../../../shared/api/client';

const STATUS_COPY: Record<string, { label: string; tone: 'good' | 'warn' | 'muted' }> = {
  applied: { label: 'Waiting for the draw', tone: 'good' },
  won: { label: 'Won', tone: 'good' },
  lost: { label: 'Not selected', tone: 'muted' },
  withdrawn: { label: 'Withdrawn', tone: 'muted' },
  rejected_gate: { label: "Couldn't apply", tone: 'warn' },
};

function toneClasses(tone: string, isDark: boolean): string {
  if (tone === 'good') return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700';
  if (tone === 'warn') return isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700';
  return isDark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#7a6b5a]';
}

export function MyApplications() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [applications, setApplications] = useState<HackathonIssueApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyHackathonIssueApplications()
      .then((res) => {
        if (!cancelled) setApplications(res.applications);
      })
      .catch((error) => {
        console.error('Failed to load applications:', error);
        if (!cancelled) toast.error('Could not load your applications.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>;
  }

  if (applications.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
        You haven't applied to any GrainHack issues yet.
      </div>
    );
  }

  const open = applications.filter((a) => a.status === 'applied').length;

  return (
    <div className="space-y-3">
      {open > 0 && (
        <p className={`text-[12px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
          {open} open {open === 1 ? 'application' : 'applications'}. Applications are free - only winning uses
          a slot.
        </p>
      )}

      {applications.map((a) => {
        const status = STATUS_COPY[a.status] ?? { label: a.status, tone: 'muted' as const };
        return (
          <div
            key={a.id}
            className={`rounded-[16px] border p-4 ${
              isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`https://github.com/${a.repo_full_name}/issues/${a.issue_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[14px] font-semibold hover:underline inline-flex items-center gap-1 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}
              >
                {a.repo_full_name}#{a.issue_number}
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${toneClasses(status.tone, isDark)}`}>
                {status.label}
              </span>
              {/* Fit is shown, but framed as an input to the draw rather
                  than a verdict - "plausible" is the expected answer for
                  most newcomers (§4.4) and must not read as a rejection. */}
              {a.fit && (
                <span
                  title="How the fit assessment scored your evidence for this issue. One input to the draw, not a decision."
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]'}`}
                >
                  {a.fit} fit
                </span>
              )}
            </div>

            <p className={`text-[12px] mt-1 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              {a.hackathon_name} &middot; applied {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
            </p>

            {a.status === 'applied' && a.application_window_closes_at && (
              <div className="mt-2">
                <ApplicationWindow opensAt={null} closesAt={a.application_window_closes_at} compact />
              </div>
            )}

            {a.status === 'rejected_gate' && a.gate_failure_reason && (
              <p className={`flex items-start gap-2 text-[12px] mt-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {a.gate_failure_reason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
