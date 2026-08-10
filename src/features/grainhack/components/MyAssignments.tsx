import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, GitPullRequest, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton } from '../../../shared/components/ui/Modal';
import {
  getMyHackathonAssignments,
  releaseHackathonAssignment,
  type HackathonAssignment,
} from '../../../shared/api/client';

const STATUS_COPY: Record<string, { label: string; tone: 'good' | 'warn' | 'muted' }> = {
  active: { label: 'In progress', tone: 'good' },
  pr_submitted: { label: 'PR submitted', tone: 'good' },
  completed: { label: 'Merged', tone: 'good' },
  released_stale: { label: 'Released - timed out', tone: 'warn' },
  released_voluntary: { label: 'Released by you', tone: 'muted' },
  released_event_end: { label: 'Released - event ended', tone: 'muted' },
};

function toneClasses(tone: string, isDark: boolean): string {
  if (tone === 'good') return isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-700';
  if (tone === 'warn') return isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700';
  return isDark ? 'bg-white/10 text-[#b8a898]' : 'bg-black/[0.06] text-[#7a6b5a]';
}

/** A contributor's own GrainHack assignments: what they hold, how long is
 * left before the stale timer releases it, and the way to hand one back. */
export function MyAssignments() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [assignments, setAssignments] = useState<HackathonAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [releasing, setReleasing] = useState<HackathonAssignment | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getMyHackathonAssignments();
      setAssignments(res.assignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toast.error('Could not load your assignments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRelease = async () => {
    if (!releasing) return;
    setIsReleasing(true);
    try {
      const res = await releaseHackathonAssignment(releasing.id);
      toast.success(
        res.abandon_recorded
          ? 'Released. This counted as an abandon.'
          : 'Released with no penalty - you were inside the grace window.',
      );
      setReleasing(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not release the assignment.');
    } finally {
      setIsReleasing(false);
    }
  };

  if (isLoading) {
    return <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>;
  }

  if (assignments.length === 0) {
    return (
      <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
        You don't have any GrainHack assignments yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const status = STATUS_COPY[a.status] ?? { label: a.status, tone: 'muted' as const };
        const isOpen = a.status === 'active' || a.status === 'pr_submitted';
        // The stale deadline only exists while work is outstanding; the
        // backend clears it the moment a qualifying PR lands.
        const staleSoon =
          a.stale_at != null && new Date(a.stale_at).getTime() - Date.now() < 48 * 3600 * 1000;

        return (
          <div
            key={a.id}
            className={`rounded-[16px] border p-4 ${
              isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
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
                  {a.holds_slot && (
                    <span
                      title="This assignment is using one of your slots"
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'}`}
                    >
                      Using a slot
                    </span>
                  )}
                </div>
                <p className={`text-[12px] mt-1 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                  {a.hackathon_name} &middot; assigned {formatDistanceToNow(new Date(a.assigned_at), { addSuffix: true })}
                </p>

                {a.qualifying_pr_number && (
                  <p className={`flex items-center gap-1.5 text-[12px] mt-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <a
                      href={`https://github.com/${a.repo_full_name}/pull/${a.qualifying_pr_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      PR #{a.qualifying_pr_number}
                    </a>
                  </p>
                )}

                {a.stale_at && (
                  <p
                    className={`flex items-center gap-1.5 text-[12px] mt-1 ${
                      staleSoon ? (isDark ? 'text-amber-400' : 'text-amber-700') : isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Submit a PR within {formatDistanceToNow(new Date(a.stale_at))} or this is released
                  </p>
                )}

                {a.release_reason && (
                  <p className={`text-[12px] mt-1 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
                    {a.release_reason}
                    {a.abandon_recorded && ' (counted as an abandon)'}
                  </p>
                )}
              </div>

              {isOpen && (
                <button
                  onClick={() => setReleasing(a)}
                  className={`px-4 py-2 rounded-[10px] text-[13px] font-medium border transition-all shrink-0 ${
                    isDark
                      ? 'bg-white/[0.08] border-white/15 text-[#d4d4d4] hover:bg-white/[0.12]'
                      : 'bg-white/[0.15] border-white/25 text-[#7a6b5a] hover:bg-white/[0.2]'
                  }`}
                >
                  Give this back
                </button>
              )}
            </div>
          </div>
        );
      })}

      <ReleaseModal
        assignment={releasing}
        isReleasing={isReleasing}
        onCancel={() => setReleasing(null)}
        onConfirm={handleRelease}
      />
    </div>
  );
}

function ReleaseModal({
  assignment,
  isReleasing,
  onCancel,
  onConfirm,
}: {
  assignment: HackathonAssignment | null;
  isReleasing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // The grace window is configurable per event, so rather than hardcoding
  // "48 hours" the copy states the rule and the backend's response reports
  // what actually happened. Telling someone "no penalty" and then recording
  // an abandon would be the worst possible outcome here.
  return (
    <Modal
      isOpen={!!assignment}
      onClose={onCancel}
      title="Give this assignment back?"
      icon={<AlertTriangle className="w-6 h-6 text-[#c9983a]" />}
      width="md"
    >
      <div className="space-y-4">
        <p className={`text-[14px] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>
          {assignment?.repo_full_name}#{assignment?.issue_number} goes back into the pool and your slot frees
          up immediately.
        </p>
        <p className={`text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          If you're still inside this event's grace window there's no penalty. After it, this counts as an
          abandon, and enough abandons stop you being assigned anything else in this event.
        </p>
        <ModalFooter>
          <ModalButton onClick={onCancel}>Keep it</ModalButton>
          <ModalButton variant="primary" onClick={onConfirm} disabled={isReleasing}>
            {isReleasing ? 'Releasing...' : 'Give it back'}
          </ModalButton>
        </ModalFooter>
      </div>
    </Modal>
  );
}
