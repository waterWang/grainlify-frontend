import { useEffect, useState } from 'react';
import { Scale, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton } from '../../../shared/components/ui/Modal';
import {
  getHackathonAppeals,
  decideHackathonAppeal,
  type HackathonAppeal,
  type AppealWindow,
} from '../../../shared/api/client';
import { VerdictDetail } from './VerdictDetail';

const BUCKETS = ['rejected', 'accepted', 'substantial', 'exceptional'] as const;

interface AppealsReviewProps {
  hackathonId: string;
}

/** AI-specs.md §6: "Appeal routes to a human with both model verdicts and the
 * diff. Human decision is final and recorded."
 *
 * The full verdict is rendered inline beneath each appeal rather than behind a
 * link, because a reviewer who has to go and fetch the evidence separately is
 * a reviewer who sometimes will not. */
export function AppealsReview({ hackathonId }: AppealsReviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [appeals, setAppeals] = useState<HackathonAppeal[]>([]);
  const [window, setWindow] = useState<AppealWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deciding, setDeciding] = useState<HackathonAppeal | null>(null);
  const [upheld, setUpheld] = useState(true);
  const [bucket, setBucket] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getHackathonAppeals(hackathonId);
      setAppeals(res.appeals);
      setWindow(res.appeal_window);
    } catch (error) {
      console.error('Failed to load appeals:', error);
      toast.error('Could not load appeals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const openDecision = (a: HackathonAppeal) => {
    setDeciding(a);
    setUpheld(true);
    setBucket(a.verdict?.final_bucket ?? '');
    setReason('');
  };

  const submitDecision = async () => {
    if (!deciding || !reason.trim()) return;
    setIsSubmitting(true);
    try {
      await decideHackathonAppeal(deciding.id, upheld, reason.trim(), upheld ? bucket : undefined);
      toast.success('Decision recorded. The contributor can see it and your reasoning.');
      setDeciding(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record the decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardClass = isDark
    ? 'rounded-2xl border border-white/10 bg-white/[0.03] p-5'
    : 'rounded-2xl border border-black/[0.06] bg-white p-5';
  const mutedText = isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const strongText = isDark ? 'text-[#e8dcc8]' : 'text-[#3d2f24]';

  const pending = appeals.filter((a) => a.status === 'pending').length;

  if (isLoading) {
    return <p className={`text-sm ${mutedText}`}>Loading appeals...</p>;
  }

  return (
    <div className="space-y-4">
      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className={`h-4 w-4 ${mutedText}`} />
            <span className={`text-sm font-medium ${strongText}`}>
              {pending === 0
                ? 'No appeals awaiting a decision'
                : `${pending} appeal${pending === 1 ? '' : 's'} awaiting a decision`}
            </span>
          </div>
          {window && (
            <span className={`text-xs ${mutedText}`}>
              {window.closed_out_at
                ? 'Appeal window closed and payouts recomputed'
                : window.open && window.closes_at
                  ? `Window closes ${formatDistanceToNow(new Date(window.closes_at), { addSuffix: true })}`
                  : window.opens_at
                    ? 'Window has elapsed - close it out to recompute payouts'
                    : 'Results not published yet'}
            </span>
          )}
        </div>
        {pending > 0 && (
          <p className={`mt-2 text-xs ${mutedText}`}>
            The hackathon cannot settle, and nothing pays out, until each of these has an answer.
          </p>
        )}
      </div>

      {appeals.length === 0 ? (
        <div className={cardClass}>
          <p className={`text-sm ${mutedText}`}>No appeals have been submitted.</p>
        </div>
      ) : (
        appeals.map((a) => (
          <div key={a.id} className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={`font-medium ${strongText}`}>
                  {a.github_login}
                  {a.verdict && (
                    <span className={`ml-2 text-sm font-normal ${mutedText}`}>
                      {a.verdict.repo_full_name} #{a.verdict.pr_number}
                    </span>
                  )}
                </p>
                <p className={`mt-0.5 text-xs ${mutedText}`}>
                  Appealed {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  a.status === 'pending'
                    ? isDark
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-amber-500/15 text-amber-700'
                    : a.status === 'upheld'
                      ? isDark
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-green-500/15 text-green-700'
                      : isDark
                        ? 'bg-white/10 text-[#b8a898]'
                        : 'bg-black/[0.06] text-[#7a6b5a]'
                }`}
              >
                {a.status === 'pending' ? (
                  <Clock className="h-3 w-3" />
                ) : a.status === 'upheld' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {a.status === 'pending' ? 'Awaiting decision' : a.status === 'upheld' ? 'Upheld' : 'Not upheld'}
              </span>
            </div>

            <div
              className={`mt-3 rounded-xl px-3 py-2 text-sm ${
                isDark ? 'bg-white/[0.04] text-[#b8a898]' : 'bg-black/[0.03] text-[#7a6b5a]'
              }`}
            >
              <span className={`font-medium ${strongText}`}>Their grounds: </span>
              {a.reason}
            </div>

            {a.decision_reason && (
              <div
                className={`mt-2 rounded-xl px-3 py-2 text-sm ${
                  isDark ? 'bg-white/[0.04] text-[#b8a898]' : 'bg-black/[0.03] text-[#7a6b5a]'
                }`}
              >
                <span className={`font-medium ${strongText}`}>Decision: </span>
                {a.decision_reason}
                {a.decided_bucket && ` (moved to ${a.decided_bucket})`}
              </div>
            )}

            {a.verdict && (
              <div className="mt-4">
                <VerdictDetail verdict={a.verdict} shadowMode={true} onOverridden={load} />
              </div>
            )}

            {a.status === 'pending' && (
              <button
                onClick={() => openDecision(a)}
                className={`mt-4 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-white/10 text-[#e8dcc8] hover:bg-white/15'
                    : 'bg-black/[0.06] text-[#3d2f24] hover:bg-black/[0.09]'
                }`}
              >
                Decide this appeal
              </button>
            )}
          </div>
        ))
      )}

      <Modal isOpen={deciding !== null} onClose={() => setDeciding(null)} title="Decide appeal">
        <div className="flex gap-2">
          <button
            onClick={() => setUpheld(true)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
              upheld
                ? isDark
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-green-500/15 text-green-700'
                : isDark
                  ? 'bg-white/[0.06] text-[#b8a898]'
                  : 'bg-black/[0.04] text-[#7a6b5a]'
            }`}
          >
            Uphold
          </button>
          <button
            onClick={() => setUpheld(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
              !upheld
                ? isDark
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-red-500/15 text-red-700'
                : isDark
                  ? 'bg-white/[0.06] text-[#b8a898]'
                  : 'bg-black/[0.04] text-[#7a6b5a]'
            }`}
          >
            Do not uphold
          </button>
        </div>

        {upheld && (
          <div className="mt-3">
            <label className={`text-xs font-medium ${mutedText}`}>
              Bucket (leave unchanged if the reasoning was wrong but the outcome was right)
            </label>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                isDark
                  ? 'border-white/10 bg-white/[0.04] text-[#e8dcc8]'
                  : 'border-black/[0.08] bg-white text-[#3d2f24]'
              }`}
            >
              <option value="">Leave unchanged</option>
              {BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className={`mt-3 block text-xs font-medium ${mutedText}`}>
          Reason (required — the contributor is shown this, and it feeds the calibration set)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${
            isDark
              ? 'border-white/10 bg-white/[0.04] text-[#e8dcc8] placeholder:text-[#8a7a6a]'
              : 'border-black/[0.08] bg-white text-[#3d2f24] placeholder:text-[#a89880]'
          }`}
          placeholder="What you checked, and why it does or does not change the bucket."
        />

        {upheld && bucket && (
          <p className={`mt-2 text-xs ${mutedText}`}>
            Changing a bucket changes the total unit count, so every contributor's share is
            recomputed once when the appeal window closes.
          </p>
        )}

        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeciding(null)}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={submitDecision}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? 'Recording...' : 'Record decision'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
