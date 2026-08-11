import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ShieldOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import {
  getAdminSocialFollowSubmissions,
  approveSocialFollowSubmission,
  rejectSocialFollowSubmission,
  revokeSocialFollowSubmission,
  type SocialFollowSubmission,
} from '../../../shared/api/client';

type Decision = 'reject' | 'revoke';

/** Review queue for social-follow proof.
 *
 *  One submission covers both platforms and gets one decision. Both
 *  screenshots are shown side by side because judging one without the other
 *  in view is making half a decision — and a half decision is exactly what
 *  the atomic submission model exists to prevent.
 */
export function SocialFollowReview() {
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState<SocialFollowSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  // Rejection and revocation both require a reason, so both go through the
  // same prompt rather than one being a bare button.
  const [deciding, setDeciding] = useState<{ submission: SocialFollowSubmission; decision: Decision } | null>(null);
  const [reason, setReason] = useState('');

  const dark = theme === 'dark';
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = dark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';

  const fetchSubmissions = async (status: typeof filter = filter) => {
    setIsLoading(true);
    try {
      const res = await getAdminSocialFollowSubmissions(status);
      setSubmissions(res.submissions);
    } catch (error) {
      console.error('Failed to fetch social-follow submissions:', error);
      toast.error('Failed to load submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const who = (s: SocialFollowSubmission) => s.github_login || s.user_id;

  const handleApprove = async (submission: SocialFollowSubmission) => {
    setActioningId(submission.id);
    try {
      await approveSocialFollowSubmission(submission.id);
      toast.success(`${who(submission)} is now eligible.`);
      await fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve.');
    } finally {
      setActioningId(null);
    }
  };

  const submitDecision = async () => {
    if (!deciding || !reason.trim()) return;
    const { submission, decision } = deciding;
    setActioningId(submission.id);
    try {
      if (decision === 'reject') {
        await rejectSocialFollowSubmission(submission.id, reason.trim());
        toast.success(`Rejected ${who(submission)}'s proof.`);
      } else {
        await revokeSocialFollowSubmission(submission.id, reason.trim());
        toast.success(`Withdrew ${who(submission)}'s eligibility.`);
      }
      setDeciding(null);
      setReason('');
      await fetchSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record the decision.');
    } finally {
      setActioningId(null);
    }
  };

  const shot = (src: string, label: string) => (
    <figure className="flex-1 min-w-0">
      <figcaption className={`text-[12px] font-semibold mb-1.5 ${muted}`}>{label}</figcaption>
      <a href={src} target="_blank" rel="noopener noreferrer">
        <img
          src={src}
          alt={`${label} follow proof`}
          className={`w-full h-44 object-cover rounded-[12px] border transition-colors ${
            dark ? 'border-white/10 bg-white/[0.04]' : 'border-black/10 bg-black/[0.03]'
          }`}
        />
      </a>
    </figure>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-[12px] text-[13px] font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-[#a2792c] text-white'
                : dark
                  ? 'bg-white/[0.06] text-[#d4c5b0] hover:bg-white/[0.1]'
                  : 'bg-black/[0.04] text-[#7a6b5a] hover:bg-black/[0.07]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className={`w-6 h-6 animate-spin ${dark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
        </div>
      ) : submissions.length === 0 ? (
        <p className={`text-[14px] py-8 text-center ${muted}`}>Nothing here.</p>
      ) : (
        submissions.map((s) => (
          <div
            key={s.id}
            className={`rounded-[16px] border p-5 transition-colors ${
              dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <p className={`text-[15px] font-semibold ${strong}`}>{who(s)}</p>
                <p className={`text-[12px] ${muted}`}>Submitted {new Date(s.created_at).toLocaleString()}</p>
                {s.decision_reason && (
                  <p className={`text-[12px] mt-1 ${muted}`}>
                    <span className="capitalize">{s.status}</span>: {s.decision_reason}
                  </p>
                )}
              </div>
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full capitalize ${
                s.status === 'approved'
                  ? 'bg-green-500/15 text-green-500'
                  : s.status === 'pending'
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-red-500/15 text-red-500'
              }`}>
                {s.status}
              </span>
            </div>

            {/* Side by side, always both. */}
            <div className="flex gap-3 flex-col sm:flex-row">
              {shot(s.linkedin_screenshot, 'LinkedIn')}
              {shot(s.x_screenshot, 'X')}
            </div>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {s.status === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={actioningId === s.id}
                    onClick={() => handleApprove(s)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-green-500/15 text-green-500 hover:bg-green-500/25 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve both
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === s.id}
                    onClick={() => {
                      setDeciding({ submission: s, decision: 'reject' });
                      setReason('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-red-500/15 text-red-500 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {/* Only an approval can be withdrawn - the API refuses anything
                  else, and offering the button elsewhere would invite a
                  misclick on the wrong row. */}
              {s.status === 'approved' && (
                <button
                  type="button"
                  disabled={actioningId === s.id}
                  onClick={() => {
                    setDeciding({ submission: s, decision: 'revoke' });
                    setReason('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-red-500/15 text-red-500 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
                >
                  <ShieldOff className="w-4 h-4" /> Revoke eligibility
                </button>
              )}
            </div>
          </div>
        ))
      )}

      <Modal
        isOpen={deciding !== null}
        onClose={() => setDeciding(null)}
        title={deciding?.decision === 'revoke' ? 'Revoke eligibility' : 'Reject this proof'}
      >
        <p className={`text-[13px] ${muted}`}>
          {deciding?.decision === 'revoke'
            ? 'This withdraws eligibility for the Founding Contributor Pool. The submission and both screenshots are kept — only the status changes. The reason is shown to the contributor.'
            : 'The reason is shown to the contributor so they can fix the problem and submit again.'}
        </p>
        <ModalInput
          value={reason}
          onChange={setReason}
          placeholder={
            deciding?.decision === 'revoke'
              ? 'e.g. no longer following on LinkedIn'
              : 'e.g. the screenshot does not show your account following'
          }
          autoFocus
        />
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeciding(null)}>
            Cancel
          </ModalButton>
          {/* Named distinctly from the row buttons behind the modal: two
              controls with the same accessible name on screen at once is
              ambiguous to anyone navigating by label. */}
          <ModalButton variant="primary" onClick={submitDecision} disabled={!reason.trim()}>
            {deciding?.decision === 'revoke' ? 'Confirm revocation' : 'Confirm rejection'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
