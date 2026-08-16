import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ShieldOff, Loader2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import {
  getAdminSocialFollowSubmissions,
  getSocialFollowReasonCodes,
  getSocialFollowProofs,
  approveSocialFollowSubmission,
  bulkApproveSocialFollowSubmissions,
  rejectSocialFollowSubmission,
  revokeSocialFollowSubmission,
  type SocialFollowSubmission,
  type SocialFollowReasonCode,
  type SocialFollowProofs,
} from '../../../shared/api/client';

type Decision = 'reject' | 'revoke';

/** Review queue for social-follow proof.
 *
 *  One submission covers both platforms and gets one decision. Both
 *  screenshots are shown side by side because judging one without the other
 *  in view is making half a decision — and a half decision is exactly what
 *  the atomic submission model exists to prevent.
 *
 *  Paged. Each row carries both screenshots inline as base64, so the
 *  unpaginated queue was a 17MB response that grew with the backlog. The page
 *  also bounds what a reviewer can act on at once, which is what any
 *  future "select all on this page" has to mean to be worth anything.
 */
export function SocialFollowReview() {
  const { theme } = useTheme();
  const [submissions, setSubmissions] = useState<SocialFollowSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<{ total: number; limit: number; hasMore: boolean }>({
    total: 0,
    limit: 0,
    hasMore: false,
  });
  // Rejection and revocation both require a reason, so both go through the
  // same prompt rather than one being a bare button.
  const [deciding, setDeciding] = useState<{ submission: SocialFollowSubmission; decision: Decision } | null>(null);
  const [reason, setReason] = useState('');
  // Rejection picks a code; revocation stays free text. The codes are fetched
  // rather than listed here so their wording lives in one place - the same
  // list resolves the label the contributor reads and the text of the email.
  const [reasonCodes, setReasonCodes] = useState<SocialFollowReasonCode[]>([]);
  const [reasonCode, setReasonCode] = useState('');

  // Selection is per-page and per-id. Ids rather than indices, so a refetch
  // that reorders or shortens the page cannot silently move a tick from one
  // person's submission to another's.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  // One row open at a time. The point of collapsing is that a reviewer can see
  // the whole queue at once; letting several expand would give that back a row
  // at a time until the page looked like it did before.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Proofs are cached per submission, so collapsing and reopening a row does
  // not refetch ~775kB of base64.
  const [proofs, setProofs] = useState<Record<string, SocialFollowProofs>>({});
  const [loadingProofsFor, setLoadingProofsFor] = useState<string | null>(null);
  const [proofsError, setProofsError] = useState<Record<string, string>>({});

  const toggleExpanded = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (proofs[id] || loadingProofsFor === id) return;
    setLoadingProofsFor(id);
    setProofsError((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await getSocialFollowProofs(id);
      setProofs((prev) => ({ ...prev, [id]: res }));
    } catch (error) {
      // Kept on the row rather than raised as a toast: the failure belongs to
      // one submission, and a reviewer needs to know THIS proof did not load
      // rather than that something somewhere did not.
      setProofsError((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : 'Could not load the proofs.',
      }));
    } finally {
      setLoadingProofsFor(null);
    }
  };

  const dark = theme === 'dark';
  const strong = dark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  // Light mode reads --brand-ink-muted rather than the literal #7a6b5a, which
  // measures 3.90-4.07 against the glass in this component. Same change the
  // shared modal primitives got, measured on these surfaces rather than
  // assumed from that one.
  const muted = dark ? 'text-[#b8a898]' : 'text-[var(--brand-ink-muted)]';

  const fetchSubmissions = async (status: typeof filter = filter, at: number = offset) => {
    setIsLoading(true);
    try {
      const res = await getAdminSocialFollowSubmissions(status, { offset: at });
      setSubmissions(res.submissions);
      setPage({ total: res.total, limit: res.limit, hasMore: res.has_more });
      // A decision can empty the last page. Stepping back rather than showing
      // "Nothing here" on page 3 of a queue that still has rows.
      if (res.submissions.length === 0 && at > 0) {
        const back = Math.max(0, at - res.limit);
        setOffset(back);
      }
    } catch (error) {
      console.error('Failed to fetch social-follow submissions:', error);
      toast.error('Failed to load submissions.');
    } finally {
      setIsLoading(false);
    }
  };

  // Changing the filter returns to the first page: keeping an offset across a
  // filter change lands on an arbitrary slice of a different queue.
  const changeFilter = (next: typeof filter) => {
    setFilter(next);
    setOffset(0);
  };

  useEffect(() => {
    fetchSubmissions(filter, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, offset]);

  useEffect(() => {
    getSocialFollowReasonCodes()
      .then((res) => setReasonCodes(res.reason_codes))
      .catch(() => {
        // Non-fatal: the picker falls back to a note-only rejection, which the
        // API still accepts. Better than blocking review entirely.
        toast.error('Could not load rejection reasons. You can still reject with a note.');
      });
  }, []);

  // Any change to what is on screen clears the selection.
  //
  // A tick means "I have looked at this submission". After a filter change or
  // a page turn the rows are different ones, so carrying ticks across would
  // mean approving something the reviewer never saw - which is the exact thing
  // the page-scoped selection exists to prevent.
  useEffect(() => {
    setSelected(new Set());
  }, [filter, offset]);

  const who = (s: SocialFollowSubmission) => s.github_login || s.user_id;

  const handleApprove = async (submission: SocialFollowSubmission) => {
    setActioningId(submission.id);
    try {
      await approveSocialFollowSubmission(submission.id);
      toast.success(`${who(submission)} is now eligible.`);
      await fetchSubmissions(filter, offset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve.');
    } finally {
      setActioningId(null);
    }
  };

  const chosenReason = reasonCodes.find((r) => r.code === reasonCode);
  // "Other" names no problem, so it needs the note. Every other code already
  // says what was wrong and the note is optional detail.
  const decisionReady =
    deciding?.decision === 'revoke'
      ? reason.trim().length > 0
      : reasonCodes.length === 0
        ? reason.trim().length > 0 // codes unavailable: fall back to note-only
        : reasonCode !== '' && (!chosenReason?.needs_note || reason.trim().length > 0);

  const submitDecision = async () => {
    if (!deciding || !decisionReady) return;
    const { submission, decision } = deciding;
    setActioningId(submission.id);
    try {
      if (decision === 'reject') {
        await rejectSocialFollowSubmission(submission.id, {
          reasonCode,
          note: reason.trim(),
        });
        toast.success(`Rejected ${who(submission)}'s proof.`);
      } else {
        await revokeSocialFollowSubmission(submission.id, reason.trim());
        toast.success(`Withdrew ${who(submission)}'s eligibility.`);
      }
      setDeciding(null);
      setReason('');
      setReasonCode('');
      await fetchSubmissions(filter, offset);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record the decision.');
    } finally {
      setActioningId(null);
    }
  };

  // --- selection ------------------------------------------------------------

  const selectablePending = submissions.filter((s) => s.status === 'pending');
  const allOnPageSelected =
    selectablePending.length > 0 && selectablePending.every((s) => selected.has(s.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selects the pending rows ON THIS PAGE only, never the queue.
  //
  // The label says "on this page" and that has to be literally true: approving
  // grants Founding Contributor Pool eligibility, so a control that quietly
  // reached past what the reviewer can see would be handing out eligibility
  // for proof nobody looked at. The server refuses a selection larger than a
  // page for the same reason, so this cannot be worked around by other means.
  const toggleAllOnPage = () => {
    setSelected(allOnPageSelected ? new Set() : new Set(selectablePending.map((s) => s.id)));
  };

  const runBulkApprove = async () => {
    const ids = selectablePending.filter((s) => selected.has(s.id)).map((s) => s.id);
    if (ids.length === 0) return;
    setIsBulkRunning(true);
    try {
      const res = await bulkApproveSocialFollowSubmissions(ids);

      // Report all three facts, never a bare "Done". A skip is the queue
      // having moved under the reviewer and needs no action; a failure is
      // something that went wrong and is worth retrying. Saying "20 approved"
      // when three were not is the exact lie this reporting exists to avoid.
      const parts = [`${res.approved_count} approved`];
      if (res.skipped_count > 0) parts.push(`${res.skipped_count} skipped`);
      if (res.failed_count > 0) parts.push(`${res.failed_count} failed`);
      const summary = parts.join(', ');

      if (res.failed_count > 0) {
        toast.error(summary + ' — the failures are still selected, so you can retry them.');
      } else if (res.skipped_count > 0) {
        toast(summary + ' — skipped ones had already been decided.');
      } else {
        toast.success(summary + '.');
      }

      // Failures stay ticked so a retry is one click; everything decided or
      // skipped is cleared, because there is nothing left to do to it.
      setSelected(new Set(res.failed.map((f) => f.id)));
      setConfirmingBulk(false);
      await fetchSubmissions(filter, offset);
    } catch (error) {
      // The whole request failed, so nothing was approved and the selection is
      // left exactly as it was.
      toast.error(error instanceof Error ? error.message : 'Bulk approval failed. Nothing was changed.');
    } finally {
      setIsBulkRunning(false);
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
            onClick={() => changeFilter(f)}
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

      {/* Selection bar. Only for the pending queue: approving is the only bulk
          action, and it only applies to undecided rows. */}
      {filter === 'pending' && selectablePending.length > 0 && (
        <div
          className={`flex items-center justify-between gap-3 flex-wrap rounded-[14px] border px-4 py-3 ${
            dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
          }`}
        >
          <label className={`flex items-center gap-2.5 min-h-[44px] cursor-pointer text-[13px] font-medium ${strong}`}>
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleAllOnPage}
              className="w-4 h-4 rounded accent-[#a2792c] cursor-pointer"
            />
            {/* Says "on this page" because that is exactly what it does. The
                server refuses a selection larger than a page, so the label
                cannot quietly become untrue. */}
            Select all on this page
            <span className={muted}>
              ({selectablePending.length} pending here{page.total > selectablePending.length ? ` of ${page.total}` : ''})
            </span>
          </label>

          <button
            type="button"
            disabled={selected.size === 0 || isBulkRunning}
            onClick={() => setConfirmingBulk(true)}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-[12px] text-[13px] font-semibold bg-green-500/15 hover:bg-green-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              dark ? 'text-green-400' : 'text-green-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve selected{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      )}

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
            className={`rounded-[16px] border transition-colors ${
              dark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
            } ${expandedId === s.id ? 'p-5' : 'px-4 py-2.5'}`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {s.status === 'pending' && (
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    aria-label={`Select ${who(s)}'s submission`}
                    className="w-4 h-4 rounded accent-[#a2792c] cursor-pointer shrink-0"
                  />
                )}
                {/* The whole identity block is the disclosure control, so the
                    target is the row rather than a chevron somebody has to
                    aim at. Actions stay outside it - a click meant for
                    Approve must never toggle the row instead. */}
                <button
                  type="button"
                  onClick={() => void toggleExpanded(s.id)}
                  aria-expanded={expandedId === s.id}
                  aria-label={`${expandedId === s.id ? 'Hide' : 'Show'} ${who(s)}'s follow proofs`}
                  className="flex items-center gap-3 min-h-[44px] min-w-0 text-left"
                >
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${muted} ${expandedId === s.id ? 'rotate-180' : ''}`}
                  />
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
                  ) : (
                    <span className={`w-7 h-7 rounded-full shrink-0 ${dark ? 'bg-white/10' : 'bg-black/10'}`} />
                  )}
                  <span className="min-w-0">
                <p className={`text-[15px] font-semibold truncate ${strong}`}>{who(s)}</p>
                <p className={`text-[12px] ${muted}`}>Submitted {new Date(s.created_at).toLocaleDateString()}</p>
                {(s.reason_label || s.decision_reason) && (
                  <p className={`text-[12px] mt-1 ${muted}`}>
                    <span className="capitalize">{s.status}</span>:{' '}
                    {/* Label first, note second - the same shape the
                        contributor sees, resolved by the backend so this
                        doesn't keep its own copy of what a code means. */}
                    {[s.reason_label, s.decision_reason].filter(Boolean).join(' — ')}
                  </p>
                )}
                {/* Approval grants founding-pool eligibility, so a decision
                    shouldn't appear without a name against it. Recorded since
                    the feature shipped; it just wasn't readable from here. */}
                {s.decided_at && (
                  <p className={`text-[12px] mt-0.5 ${muted}`}>
                    {s.decided_by_login ? `Decided by ${s.decided_by_login}` : 'Decided'} on{' '}
                    {new Date(s.decided_at).toLocaleString()}
                  </p>
                )}
                  </span>
                </button>
              </div>
              {/* Every variant measured, not just the one on screen at the
                  time. In light all three failed on their own wash (1.55-2.49);
                  in dark only red did, at 3.79 - green and amber measured 5.76
                  and 5.79 there and are left alone. Measuring `pending` alone
                  would have declared dark fine and shipped the red failure.

                  `revoked` shares the red branch with `rejected`, so it is
                  covered by the same values rather than falling through to
                  something unmeasured. */}
              <div className="flex items-center gap-2 shrink-0">
              {s.status === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={actioningId === s.id}
                    onClick={() => handleApprove(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold bg-green-500/15 hover:bg-green-500/25 disabled:opacity-50 transition-colors ${
                      dark ? 'text-green-400' : 'text-green-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve both
                  </button>
                  <button
                    type="button"
                    disabled={actioningId === s.id}
                    onClick={() => {
                      setDeciding({ submission: s, decision: 'reject' });
                      setReason('');
                      setReasonCode('');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 transition-colors ${
                      dark ? 'text-red-400' : 'text-red-800'
                    }`}
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
                    setReasonCode('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 transition-colors ${
                    dark ? 'text-red-400' : 'text-red-800'
                  }`}
                >
                  <ShieldOff className="w-4 h-4" /> Revoke eligibility
                </button>
              )}
              <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full capitalize ${
                s.status === 'approved'
                  ? dark
                    ? 'bg-green-500/15 text-green-500'
                    : 'bg-green-500/15 text-green-800'
                  : s.status === 'pending'
                    ? dark
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-amber-500/15 text-amber-800'
                    : dark
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-red-500/15 text-red-800'
              }`}>
                {s.status}
              </span>
              </div>
            </div>

            {/* Proofs, only once the row is open.
                Both platforms together, never one - a decision covers both,
                and judging one without the other in view is half a decision.
                Collapsed by default because 22 pending submissions rendering
                two screenshots each fit two rows on a screen. */}
            {expandedId === s.id && (
              <div className="mt-4">
                {loadingProofsFor === s.id ? (
                  <div className="flex items-center gap-2 py-8 justify-center">
                    <Loader2 className={`w-5 h-5 animate-spin ${dark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
                    <span className={`text-[13px] ${muted}`}>Loading proofs…</span>
                  </div>
                ) : proofsError[s.id] ? (
                  <div className="flex items-center gap-3 py-6 justify-center flex-wrap">
                    <span className={`text-[13px] ${dark ? 'text-red-400' : 'text-red-800'}`}>{proofsError[s.id]}</span>
                    <button
                      type="button"
                      onClick={() => { setProofsError((p) => ({ ...p, [s.id]: '' })); setExpandedId(null); void toggleExpanded(s.id); }}
                      className={`min-h-[44px] px-3 rounded-[10px] text-[13px] font-medium ${dark ? 'bg-white/[0.08] text-[#d4c5b0]' : 'bg-black/[0.04] text-[#4a3d2a]'}`}
                    >
                      Retry
                    </button>
                  </div>
                ) : proofs[s.id] ? (
                  <div className="flex gap-3 flex-col sm:flex-row">
                    {shot(proofs[s.id].linkedin_screenshot, 'LinkedIn')}
                    {shot(proofs[s.id].x_screenshot, 'X')}
                  </div>
                ) : null}
              </div>
            )}

          </div>
        ))
      )}

      {/* Always rendered when there is more than one page, including while
          loading, so the control doesn't disappear under the cursor on every
          refetch. */}
      {(page.total > page.limit || offset > 0) && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <p className={`text-[13px] ${muted}`}>
            {page.total === 0
              ? 'No submissions'
              : `Showing ${offset + 1}–${offset + submissions.length} of ${page.total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || isLoading}
              onClick={() => setOffset(Math.max(0, offset - page.limit))}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-[12px] text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                dark ? 'bg-white/[0.06] text-[#d4c5b0] hover:bg-white/[0.1]' : 'bg-black/[0.04] text-[#4a3d2a] hover:bg-black/[0.07]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <button
              type="button"
              disabled={!page.hasMore || isLoading}
              onClick={() => setOffset(offset + page.limit)}
              className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-[12px] text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                dark ? 'bg-white/[0.06] text-[#d4c5b0] hover:bg-white/[0.1]' : 'bg-black/[0.04] text-[#4a3d2a] hover:bg-black/[0.07]'
              }`}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={confirmingBulk}
        onClose={() => setConfirmingBulk(false)}
        title="Approve selected submissions"
      >
        <p className={`text-[13px] ${muted}`}>
          {/* The count is the point of the confirmation: it is the last place
              a reviewer can notice they ticked more than they meant to. */}
          This approves <strong className={strong}>{selected.size}</strong>{' '}
          {selected.size === 1 ? 'submission' : 'submissions'} and grants each of them Founding
          Contributor Pool eligibility. Each person is notified.
        </p>
        <p className={`text-[13px] mt-2 ${muted}`}>
          Only the rows you ticked on this page are affected. Anything already decided since the
          page loaded is skipped rather than overwritten, and you'll be told how many.
        </p>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setConfirmingBulk(false)}>
            Cancel
          </ModalButton>
          <ModalButton variant="primary" onClick={runBulkApprove} disabled={isBulkRunning}>
            {isBulkRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Approve ${selected.size}`
            )}
          </ModalButton>
        </ModalFooter>
      </Modal>

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

        {/* Rejections pick a category so they can be counted; revocations stay
            free text, since they are rare and each one is its own story. */}
        {deciding?.decision === 'reject' && reasonCodes.length > 0 && (
          <fieldset className="mt-3">
            <legend className={`block text-[13px] font-medium mb-2 ${strong}`}>Reason</legend>
            <div className="flex flex-col gap-1.5">
              {reasonCodes.map((r) => (
                <label
                  key={r.code}
                  className={`flex items-center gap-2.5 min-h-[44px] px-3 rounded-[12px] cursor-pointer text-[13px] transition-colors ${
                    reasonCode === r.code
                      ? dark
                        ? 'bg-[#c9983a]/20 text-[#f5efe5]'
                        : 'bg-[#c9983a]/20 text-[#4a3d2a]'
                      : dark
                        ? 'text-[#d4c5b0] hover:bg-white/[0.06]'
                        : 'text-[#4a3d2a] hover:bg-black/[0.04]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason-code"
                    value={r.code}
                    checked={reasonCode === r.code}
                    onChange={() => setReasonCode(r.code)}
                    className="w-4 h-4 accent-[#a2792c] cursor-pointer"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-3">
          <ModalInput
            label={
              deciding?.decision === 'reject' && reasonCodes.length > 0
                ? chosenReason?.needs_note
                  ? 'What was wrong?'
                  : 'Note (optional)'
                : undefined
            }
            value={reason}
            onChange={setReason}
            placeholder={
              deciding?.decision === 'revoke'
                ? 'e.g. no longer following on LinkedIn'
                : chosenReason?.needs_note
                  ? 'Required — the contributor reads this'
                  : 'Anything else they should know'
            }
            autoFocus={deciding?.decision === 'revoke'}
          />
        </div>
        <ModalFooter>
          <ModalButton variant="secondary" onClick={() => setDeciding(null)}>
            Cancel
          </ModalButton>
          {/* Named distinctly from the row buttons behind the modal: two
              controls with the same accessible name on screen at once is
              ambiguous to anyone navigating by label. */}
          <ModalButton variant="primary" onClick={submitDecision} disabled={!decisionReady}>
            {deciding?.decision === 'revoke' ? 'Confirm revocation' : 'Confirm rejection'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
