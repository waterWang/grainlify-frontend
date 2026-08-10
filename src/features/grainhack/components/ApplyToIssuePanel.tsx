import { useEffect, useState } from 'react';
import { Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ModalInput } from '../../../shared/components/ui/Modal';
import { ApplicationWindow, windowStateOf } from './ApplicationWindow';
import {
  applyToHackathonIssue,
  getContributorHackathonIssue,
  type ContributorHackathonIssue,
  type HackathonIssueApplication,
} from '../../../shared/api/client';

interface ApplyToIssuePanelProps {
  projectId: string;
  issueNumber: number;
}

/** Contributor-facing counterpart to HackathonIssueFieldsPanel: shows the
 * GrainHack state of an issue and lets someone apply.
 *
 * Renders nothing when the issue isn't in a GrainHack, which is the common
 * case - the panel should be invisible on ordinary issues, not an empty box. */
export function ApplyToIssuePanel({ projectId, issueNumber }: ApplyToIssuePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [issue, setIssue] = useState<ContributorHackathonIssue | null>(null);
  const [applicantCount, setApplicantCount] = useState(0);
  const [application, setApplication] = useState<HackathonIssueApplication | null>(null);
  const [notApplicable, setNotApplicable] = useState(false);
  const [text, setText] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const load = async () => {
    const data = await getContributorHackathonIssue(projectId, issueNumber);
    setIssue(data.issue);
    setApplicantCount(data.applicant_count);
    setApplication(data.my_application);
  };

  useEffect(() => {
    let cancelled = false;
    setNotApplicable(false);
    setIssue(null);
    setApplication(null);

    getContributorHackathonIssue(projectId, issueNumber)
      .then((data) => {
        if (cancelled) return;
        setIssue(data.issue);
        setApplicantCount(data.applicant_count);
        setApplication(data.my_application);
      })
      .catch(() => {
        if (!cancelled) setNotApplicable(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, issueNumber]);

  if (notApplicable || !issue) return null;
  // Only published issues are open to applications at all.
  if (issue.status !== 'published') return null;

  const state = windowStateOf(
    issue.application_window_opens_at,
    issue.application_window_closes_at,
    Date.now(),
  );

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await applyToHackathonIssue(issue.id, text.trim() || undefined);
      toast.success("Applied. You'll be notified when the draw runs.");
      await load();
      setText('');
    } catch (error) {
      // The backend returns the specific §4.1 gate reason; apiRequest
      // surfaces it as the error message, so show it rather than a generic
      // failure - knowing *why* is the whole point.
      toast.error(error instanceof Error ? error.message : 'Could not apply.');
      // Refresh anyway: a gate rejection is persisted, and the panel should
      // reflect that state.
      try {
        await load();
      } catch {
        /* leave the panel as-is */
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className={`rounded-[16px] border p-4 mb-4 transition-colors ${
        isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Trophy className="w-4 h-4 text-[#c9983a]" />
        <span className={`text-[13px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
          Part of {issue.hackathon_name}
        </span>
        {issue.difficulty_tier && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]'}`}>
            {issue.difficulty_tier}
          </span>
        )}
      </div>

      <div className="mb-3">
        <ApplicationWindow
          opensAt={issue.application_window_opens_at}
          closesAt={issue.application_window_closes_at}
          applicantCount={applicantCount}
          reserved={issue.reserved}
        />
      </div>

      {issue.acceptance_criteria && (
        <div className={`rounded-[12px] p-3 mb-3 ${isDark ? 'bg-white/[0.04]' : 'bg-white/[0.25]'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Acceptance criteria
          </p>
          <p className={`text-[13px] whitespace-pre-wrap ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>
            {issue.acceptance_criteria}
          </p>
        </div>
      )}

      {application ? (
        <ApplicationStatus application={application} isDark={isDark} />
      ) : state === 'open' ? (
        <div className="space-y-3">
          <ModalInput
            label="Anything you want to add (optional)"
            value={text}
            onChange={setText}
            placeholder="Optional. The draw doesn't weight this - it's for the maintainer."
            rows={2}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className={`text-[11px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
              Applying doesn't use a slot. Only winning does.
            </p>
            <button
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2 rounded-[10px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_4px_16px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50"
            >
              {isApplying ? 'Applying...' : 'Apply for this issue'}
            </button>
          </div>
        </div>
      ) : (
        <p className={`text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {state === 'not_open'
            ? "This issue isn't accepting applications yet."
            : 'Applications have closed for this issue.'}
        </p>
      )}
    </div>
  );
}

function ApplicationStatus({
  application,
  isDark,
}: {
  application: HackathonIssueApplication;
  isDark: boolean;
}) {
  if (application.status === 'rejected_gate') {
    return (
      <div className={`flex items-start gap-2 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">You can't be assigned this issue</p>
          {/* The specific reason, not a generic rejection - §4.1 requires
              the applicant be told which gate they failed. */}
          <p className={isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}>{application.gate_failure_reason}</p>
        </div>
      </div>
    );
  }

  const copy: Record<string, { text: string; good: boolean }> = {
    applied: { text: "You've applied. The draw runs when the window closes.", good: true },
    won: { text: 'You won the draw for this issue.', good: true },
    lost: { text: 'This issue went to someone else in the draw.', good: false },
    withdrawn: { text: 'You withdrew from this issue.', good: false },
  };
  const c = copy[application.status] ?? { text: application.status, good: false };

  return (
    <div
      className={`flex items-center gap-2 text-[13px] ${
        c.good ? (isDark ? 'text-green-400' : 'text-green-700') : isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
      }`}
    >
      {c.good ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {c.text}
    </div>
  );
}
