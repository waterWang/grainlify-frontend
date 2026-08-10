import { useState } from 'react';
import { Check, X, ExternalLink, AlertTriangle, Scale, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput, ModalSelect } from '../../../shared/components/ui/Modal';
import { segmentEvidence, citationUrl, prFilesUrl } from '../citations';
import {
  overrideHackathonVerdict,
  type HackathonVerdict,
  type VerdictPayload,
  type VerdictCriterion,
} from '../../../shared/api/client';

const BUCKET_OPTIONS = [
  { value: 'rejected', label: 'Rejected' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'substantial', label: 'Substantial' },
  { value: 'exceptional', label: 'Exceptional' },
];

function bucketTone(bucket: string | null | undefined, isDark: boolean): string {
  switch (bucket) {
    case 'exceptional':
      return isDark ? 'bg-[#c9983a]/25 text-[#e8c571]' : 'bg-[#c9983a]/25 text-[#8b6f3a]';
    case 'substantial':
      return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700';
    case 'accepted':
      return isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500/20 text-blue-700';
    case 'rejected':
      return isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-500/15 text-red-700';
    default:
      return isDark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#7a6b5a]';
  }
}

interface VerdictDetailProps {
  verdict: HackathonVerdict;
  shadowMode: boolean;
  onOverridden: () => void;
}

/** A complete verdict, laid out the way someone has to read it during an
 * appeal: what was claimed, whether each criterion was met, and - critically
 * - a one-click path to check every citation against the real diff. */
export function VerdictDetail({ verdict: v, shadowMode, onOverridden }: VerdictDetailProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [overriding, setOverriding] = useState(false);
  const [bucket, setBucket] = useState(v.final_bucket ?? v.judge_bucket ?? 'accepted');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOverride = async () => {
    if (!reason.trim()) return;
    setIsSaving(true);
    try {
      await overrideHackathonVerdict(v.id, bucket, reason.trim());
      toast.success('Verdict overridden.');
      setOverriding(false);
      setReason('');
      onOverridden();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not override the verdict.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {shadowMode && (
        <p
          className={`flex items-start gap-2 text-[13px] rounded-[12px] p-3 ${
            isDark ? 'bg-white/[0.06] text-[#b8a898]' : 'bg-black/[0.04] text-[#7a6b5a]'
          }`}
        >
          <Scale className="w-4 h-4 mt-0.5 shrink-0" />
          This event is in shadow mode. Nothing here has been shown to the contributor, and no payout
          follows from it.
        </p>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <a
            href={`https://github.com/${v.repo_full_name}/pull/${v.pr_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[16px] font-bold hover:underline inline-flex items-center gap-1 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}
          >
            {v.repo_full_name}#{v.pr_number}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
            by {v.github_login}
            {v.issue_number != null && ` · resolves issue #${v.issue_number}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {v.final_bucket && (
            <span className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase ${bucketTone(v.final_bucket, isDark)}`}>
              {v.final_bucket}
            </span>
          )}
          {v.final_source === 'human_override' && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-white/10 text-[#d4d4d4]' : 'bg-black/[0.06] text-[#4a3f2f]'}`}>
              human override
            </span>
          )}
          <button
            onClick={() => setOverriding(true)}
            className="px-4 py-2 rounded-[10px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] border border-white/10 shadow-[0_4px_16px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.5)] transition-all"
          >
            {v.final_source === 'human_override' ? 'Change verdict' : 'Set verdict'}
          </button>
        </div>
      </div>

      {v.prefilter_status === 'rejected' && (
        <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-red-500/10 border-red-500/25' : 'bg-red-500/[0.06] border-red-500/25'}`}>
          <p className={`text-[12px] font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            Rejected before judging
          </p>
          <p className={`text-[13px] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>{v.prefilter_reason}</p>
        </div>
      )}

      {v.duplicate_flagged && (
        <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-500/[0.06] border-amber-500/25'}`}>
          <p className={`flex items-center gap-2 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Flagged as a possible duplicate
            {v.duplicate_similarity != null && ` (${(v.duplicate_similarity * 100).toFixed(0)}% similar)`}
            . Two people independently fixing the same bug happens - this is for review, not rejection.
          </p>
        </div>
      )}

      {v.diff_stats && <DiffStatsPanel stats={v.diff_stats} isDark={isDark} />}

      {/* Both model verdicts side by side. §5.6 routes to escalation when
          they disagree, so seeing them together is how a reviewer judges
          whether the disagreement is real. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VerdictColumn
          title="Judge"
          model={v.judge_model}
          bucket={v.judge_bucket}
          confidence={v.judge_confidence}
          payload={v.judge_payload}
          verdict={v}
          isDark={isDark}
        />
        <VerdictColumn
          title="Cross-check"
          model={v.cross_check_model}
          bucket={v.cross_check_bucket}
          confidence={null}
          payload={v.cross_check_payload}
          verdict={v}
          isDark={isDark}
        />
      </div>

      {v.escalation_bucket && (
        <VerdictColumn
          title="Escalation"
          model={null}
          bucket={v.escalation_bucket}
          confidence={null}
          payload={v.escalation_payload}
          verdict={v}
          isDark={isDark}
        />
      )}

      {v.override_reason && (
        <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Why this was overridden
          </p>
          <p className={`text-[13px] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>{v.override_reason}</p>
        </div>
      )}

      <Modal
        isOpen={overriding}
        onClose={() => setOverriding(false)}
        title="Set the final verdict"
        icon={<Scale className="w-6 h-6 text-[#c9983a]" />}
        width="md"
      >
        <div className="space-y-4">
          <ModalSelect label="Bucket" value={bucket} onChange={setBucket} options={BUCKET_OPTIONS} required />
          <ModalInput
            label="Why"
            required
            value={reason}
            onChange={setReason}
            rows={4}
            placeholder="What did the model get wrong, and how do you know? This becomes a calibration example."
          />
          {/* §5.7: every override is training data, and an override with no
              written reason is an example with no label. */}
          <p className={`text-[12px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Overridden verdicts are the most valuable examples the calibration set will ever have - but only
            if someone wrote down why.
          </p>
          <ModalFooter>
            <ModalButton onClick={() => setOverriding(false)}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleOverride} disabled={isSaving || !reason.trim()}>
              {isSaving ? 'Saving...' : 'Save verdict'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

function DiffStatsPanel({ stats, isDark }: { stats: NonNullable<HackathonVerdict['diff_stats']>; isDark: boolean }) {
  const items: { label: string; value: string; muted?: boolean }[] = [
    { label: 'Files', value: String(stats.files_changed) },
    { label: 'Added', value: `+${stats.lines_added}` },
    { label: 'Removed', value: `-${stats.lines_removed}` },
    { label: 'Meaningful', value: String(stats.meaningful_lines) },
    { label: 'Generated', value: String(stats.generated_lines), muted: true },
    { label: 'Lockfile', value: String(stats.lockfile_lines), muted: true },
    { label: 'Test lines', value: String(stats.test_lines) },
  ];
  return (
    <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.2] border-white/25'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
        Diff stats &middot; computed in code, not by the model
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((i) => (
          <div key={i.label}>
            <span className={`text-[11px] block ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>{i.label}</span>
            <span
              className={`text-[14px] font-semibold tabular-nums ${
                i.muted ? (isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]') : isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'
              }`}
            >
              {i.value}
            </span>
          </div>
        ))}
        <div className="flex items-end gap-2">
          {stats.tests_added && <Tag label="tests added" tone="good" isDark={isDark} />}
          {stats.touches_core_paths && <Tag label="core paths" tone="good" isDark={isDark} />}
          {stats.docs_only && <Tag label="docs only" tone="warn" isDark={isDark} />}
        </div>
      </div>
    </div>
  );
}

function Tag({ label, tone, isDark }: { label: string; tone: 'good' | 'warn'; isDark: boolean }) {
  const cls =
    tone === 'good'
      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700'
      : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
}

function VerdictColumn({
  title,
  model,
  bucket,
  confidence,
  payload,
  verdict,
  isDark,
}: {
  title: string;
  model: string | null;
  bucket: string | null;
  confidence: string | null;
  payload: VerdictPayload | null;
  verdict: HackathonVerdict;
  isDark: boolean;
}) {
  if (!bucket && !payload) {
    return (
      <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'}`}>
        <p className={`text-[13px] font-bold mb-1 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{title}</p>
        <p className={`text-[12px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>Not run.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[12px] border p-3 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <p className={`text-[13px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{title}</p>
        {bucket && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${bucketTone(bucket, isDark)}`}>
            {bucket}
          </span>
        )}
        {confidence && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              confidence === 'low'
                ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700'
                : isDark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#7a6b5a]'
            }`}
          >
            {confidence} confidence
          </span>
        )}
        {model && <code className={`text-[10px] ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>{model}</code>}
      </div>

      {payload?.criteria_total != null && (
        <p className={`text-[12px] mb-2 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {payload.criteria_met ?? 0} of {payload.criteria_total} criteria met
          {payload.scope && ` · ${payload.scope.replace(/_/g, ' ')}`}
          {payload.substance && ` · ${payload.substance.replace(/_/g, ' ')}`}
        </p>
      )}

      <div className="space-y-2">
        {(payload?.criteria ?? []).map((crit, i) => (
          <CriterionRow key={i} criterion={crit} verdict={verdict} isDark={isDark} />
        ))}
      </div>

      {payload?.concerns && payload.concerns.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {payload.concerns.map((c) => (
            <span
              key={c}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700'}`}
            >
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {payload?.reasoning && (
        <p className={`text-[12px] mt-2 ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>{payload.reasoning}</p>
      )}
    </div>
  );
}

function CriterionRow({
  criterion,
  verdict,
  isDark,
}: {
  criterion: VerdictCriterion;
  verdict: HackathonVerdict;
  isDark: boolean;
}) {
  const segments = segmentEvidence(criterion.evidence ?? '');
  const hasCitation = segments.some((s) => s.citation);

  return (
    <div className="flex items-start gap-2">
      {criterion.met ? (
        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-green-400' : 'text-green-700'}`} />
      ) : (
        <X className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
      )}
      <div className="min-w-0">
        <p className={`text-[13px] ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{criterion.text}</p>
        <p className={`text-[12px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {segments.map((seg, i) =>
            seg.citation ? (
              <a
                key={i}
                href={citationUrl(verdict.repo_full_name, seg.citation, verdict.merge_commit_sha)}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  verdict.merge_commit_sha
                    ? 'Opens the file at the merge commit, so these line numbers are the ones that were judged.'
                    : 'No merge commit recorded, so this opens the current HEAD - the lines may have moved since.'
                }
                className={`font-mono underline underline-offset-2 hover:no-underline ${
                  isDark ? 'text-[#e8c571]' : 'text-[#8b6f3a]'
                }`}
              >
                {seg.text}
              </a>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        {/* A citation with no file:line can't be checked in one click, which
            is the whole point of requiring one. Say so rather than leaving a
            reviewer to notice. */}
        {!hasCitation && criterion.evidence && (
          <a
            href={prFilesUrl(verdict.repo_full_name, verdict.pr_number)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[11px] mt-0.5 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'} hover:underline`}
          >
            <Copy className="w-3 h-3" />
            No file:line cited - open the full diff
          </a>
        )}
      </div>
    </div>
  );
}
