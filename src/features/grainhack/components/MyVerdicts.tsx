import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink, Scale, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton } from '../../../shared/components/ui/Modal';
import {
  getMyGrainHackVerdicts,
  appealVerdict,
  type MyVerdictEntry,
  type HackathonVerdict,
} from '../../../shared/api/client';
import { segmentEvidence, citationUrl, prFilesUrl } from '../citations';

const BUCKET_COPY: Record<string, { label: string; tone: 'top' | 'good' | 'ok' | 'no' }> = {
  exceptional: { label: 'Exceptional', tone: 'top' },
  substantial: { label: 'Substantial', tone: 'good' },
  accepted: { label: 'Accepted', tone: 'ok' },
  rejected: { label: 'Not accepted', tone: 'no' },
};

function bucketClasses(tone: string, isDark: boolean): string {
  switch (tone) {
    case 'top':
      return isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-500/15 text-purple-700';
    case 'good':
      return isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/15 text-blue-700';
    case 'ok':
      return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/15 text-green-700';
    default:
      return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-500/15 text-red-700';
  }
}

/** Evidence with every "path:line" citation turned into a link into the diff
 * at that line - the same treatment the admin review gets, because an appeal
 * is only answerable if both sides can check the same reference. */
function Evidence({ text, verdict }: { text: string; verdict: HackathonVerdict }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <>
      {segmentEvidence(text).map((seg, i) =>
        seg.citation ? (
          <a
            key={i}
            href={citationUrl(verdict.repo_full_name, seg.citation, verdict.merge_commit_sha)}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 ${
              isDark ? 'text-[#e8dcc8] hover:text-white' : 'text-[#8b6f47] hover:text-[#5a4632]'
            }`}
          >
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** AI-specs.md §6: "Contributor sees their full verdict record: criteria,
 * citations, bucket, reasoning." Everything here is the same record the
 * reviewer reads - a verdict a contributor cannot inspect is one they cannot
 * meaningfully contest. */
export function MyVerdicts() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [entries, setEntries] = useState<MyVerdictEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appealing, setAppealing] = useState<MyVerdictEntry | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getMyGrainHackVerdicts();
      setEntries(res.verdicts);
    } catch (error) {
      console.error('Failed to load verdicts:', error);
      toast.error('Could not load your results.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitAppeal = async () => {
    if (!appealing || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      await appealVerdict(appealing.verdict.id, reason.trim());
      toast.success('Appeal submitted. A reviewer will respond before payouts are released.');
      setAppealing(null);
      setReason('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the appeal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Same glass tier the sibling tabs use (MyAssignments/MyApplications) -
  // a solid white card here read as a foreign element on the light theme.
  const cardClass = isDark
    ? 'rounded-2xl border border-white/10 bg-white/[0.06] p-5'
    : 'rounded-2xl border border-white/20 bg-white/[0.12] p-5';
  const mutedText = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const strongText = isDark ? 'text-[#e8dcc8]' : 'text-[#3d2f24]';

  if (isLoading) {
    return <p className={`text-sm ${mutedText}`}>Loading your results...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className={cardClass}>
        <p className={`text-sm ${strongText}`}>No results yet.</p>
        <p className={`mt-1 text-sm ${mutedText}`}>
          Results appear here once a hackathon publishes them. The appeal window opens at the same
          time, so nothing is decided before you can see it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const v = entry.verdict;
        const bucket = v.final_bucket ?? v.judge_bucket ?? null;
        const copy = bucket ? BUCKET_COPY[bucket] : null;
        const criteria = v.judge_payload?.criteria ?? [];
        const canAppeal = entry.phase === 'results_published' && !entry.appeal;

        return (
          <div key={v.id} className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a
                  href={prFilesUrl(v.repo_full_name, v.pr_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 font-medium ${strongText} hover:underline`}
                >
                  {v.repo_full_name} #{v.pr_number}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Reviewed {formatDistanceToNow(new Date(v.updated_at), { addSuffix: true })}
                </p>
              </div>
              {copy && (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${bucketClasses(copy.tone, isDark)}`}>
                  {copy.label}
                </span>
              )}
            </div>

            {v.prefilter_status === 'rejected' && v.prefilter_reason && (
              <p className={`mt-3 text-sm ${mutedText}`}>{v.prefilter_reason}</p>
            )}

            {criteria.length > 0 && (
              <ul className="mt-4 space-y-2">
                {criteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    {c.met ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <span className={mutedText}>
                      <span className={strongText}>{c.text}</span>
                      {c.evidence && (
                        <>
                          {' — '}
                          <Evidence text={c.evidence} verdict={v} />
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {v.judge_payload?.reasoning && (
              <p className={`mt-3 text-sm ${mutedText}`}>{v.judge_payload.reasoning}</p>
            )}

            {v.final_source === 'human_override' && v.override_reason && (
              <div
                className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                  isDark ? 'bg-white/[0.04] text-[#b8a898]' : 'bg-black/[0.03] text-[#7a6b5a]'
                }`}
              >
                <span className={`font-medium ${strongText}`}>Decided by a person: </span>
                {v.override_reason}
              </div>
            )}

            {entry.appeal ? (
              <div
                className={`mt-4 rounded-xl px-3 py-3 ${
                  isDark ? 'bg-white/[0.04]' : 'bg-black/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Scale className={`h-4 w-4 ${mutedText}`} />
                  <span className={`text-sm font-medium ${strongText}`}>
                    {entry.appeal.status === 'pending'
                      ? 'Appeal under review'
                      : entry.appeal.status === 'upheld'
                        ? 'Appeal upheld'
                        : 'Appeal reviewed - original result stands'}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${mutedText}`}>
                  <span className={strongText}>You wrote: </span>
                  {entry.appeal.reason}
                </p>
                {entry.appeal.decision_reason && (
                  <p className={`mt-2 text-sm ${mutedText}`}>
                    <span className={strongText}>Reviewer: </span>
                    {entry.appeal.decision_reason}
                  </p>
                )}
                {entry.appeal.status === 'pending' && (
                  <p className={`mt-2 flex items-center gap-1.5 text-xs ${mutedText}`}>
                    <Clock className="h-3 w-3" />
                    Payouts are not released until every appeal has been answered.
                  </p>
                )}
              </div>
            ) : canAppeal ? (
              <button
                onClick={() => {
                  setAppealing(entry);
                  setReason('');
                }}
                className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white/10 text-[#e8dcc8] hover:bg-white/15'
                    : 'bg-black/[0.06] text-[#3d2f24] hover:bg-black/[0.09]'
                }`}
              >
                Appeal this result
              </button>
            ) : (
              entry.phase === 'settled' && (
                <p className={`mt-4 text-xs ${mutedText}`}>
                  The appeal window for this hackathon has closed.
                </p>
              )
            )}
          </div>
        );
      })}

      <Modal
        isOpen={appealing !== null}
        onClose={() => setAppealing(null)}
        title="Appeal this result"
      >
        <p className={`text-sm ${mutedText}`}>
          Tell us what you think the review got wrong. A person reads this and responds — the
          decision they make is final, and you will see their reasoning here.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          autoFocus
          placeholder="For example: the review says no tests were added, but src/auth/login_test.go covers the new branch."
          className={`mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
            isDark
              ? 'border-white/10 bg-white/[0.04] text-[#e8dcc8] placeholder:text-[#8a7a6a]'
              : 'border-black/[0.08] bg-white text-[#3d2f24] placeholder:text-[#a89880]'
          }`}
        />
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setAppealing(null)}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={submitAppeal}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit appeal'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
