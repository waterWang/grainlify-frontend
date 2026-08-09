import { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ModalInput, ModalSelect } from '../../../shared/components/ui/Modal';
import { getHackathonIssue, updateHackathonIssueFields, type HackathonIssue } from '../../../shared/api/client';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced' },
];

interface HackathonIssueFieldsPanelProps {
  projectId: string;
  issueNumber: number;
}

/** Maintainer-facing "add acceptance criteria and difficulty tier" panel
 * (AI-specs.md §2.2). Renders nothing when this issue isn't part of any
 * GrainHack (the common case) - deliberately silent, not an error state.
 * Gated by the caller on owner-or-admin, NOT a platform-admin-only check -
 * see IssuesTab.tsx's mount site for why. */
export function HackathonIssueFieldsPanel({ projectId, issueNumber }: HackathonIssueFieldsPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [issue, setIssue] = useState<HackathonIssue | null>(null);
  const [notApplicable, setNotApplicable] = useState(false);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [difficultyTier, setDifficultyTier] = useState('');
  const [primaryLanguage, setPrimaryLanguage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNotApplicable(false);
    setIssue(null);
    getHackathonIssue(projectId, issueNumber)
      .then((data) => {
        if (cancelled) return;
        setIssue(data);
        setAcceptanceCriteria(data.acceptance_criteria);
        setDifficultyTier(data.difficulty_tier);
        setPrimaryLanguage(data.primary_language);
      })
      .catch(() => {
        if (!cancelled) setNotApplicable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, issueNumber]);

  if (notApplicable || !issue) return null;

  const missingCriteria = !acceptanceCriteria.trim();
  const missingTier = !difficultyTier.trim();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateHackathonIssueFields(projectId, issueNumber, {
        acceptance_criteria: acceptanceCriteria,
        difficulty_tier: difficultyTier,
        primary_language: primaryLanguage,
      });
      setIssue(updated);
      toast.success(updated.status === 'published' ? 'Saved - issue is now published to GrainHack.' : 'Saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`rounded-[16px] border p-4 mb-4 transition-colors ${
        isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-[#c9983a]" />
        <span className={`text-[13px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>GrainHack: {issue.hackathon_name}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            issue.status === 'published'
              ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700'
              : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700'
          }`}
        >
          {issue.status}
        </span>
      </div>

      {issue.status !== 'published' && (
        <div className="space-y-1 mb-3">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Missing before this publishes
          </p>
          {missingCriteria && (
            <div className={`flex items-center gap-2 text-[12px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <AlertCircle className="w-3.5 h-3.5" /> Acceptance criteria
            </div>
          )}
          {missingTier && (
            <div className={`flex items-center gap-2 text-[12px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <AlertCircle className="w-3.5 h-3.5" /> Difficulty tier
            </div>
          )}
          {!missingCriteria && !missingTier && (
            <div className={`flex items-center gap-2 text-[12px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready - save to publish
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <ModalInput
          label="Acceptance criteria"
          value={acceptanceCriteria}
          onChange={setAcceptanceCriteria}
          placeholder="What must be true for a PR to satisfy this issue?"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Difficulty tier" value={difficultyTier} onChange={setDifficultyTier} options={DIFFICULTY_OPTIONS} />
          <ModalInput label="Primary language" value={primaryLanguage} onChange={setPrimaryLanguage} placeholder="auto-detected" />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-[10px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_4px_16px_rgba(162,121,44,0.35)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
