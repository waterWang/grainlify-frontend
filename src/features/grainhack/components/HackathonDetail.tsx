import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { HackathonForm } from './HackathonForm';
import { ApplicationsReview } from './ApplicationsReview';
import { DrawResults } from './DrawResults';
import { HackathonConfigSettings } from './HackathonConfigSettings';
import { AuditLog } from './AuditLog';
import {
  getAdminHackathon,
  transitionHackathon,
  type Hackathon,
  type HackathonBlockingReason,
} from '../../../shared/api/client';

const PHASE_LABELS: Record<string, string> = {
  draft: 'Draft',
  application_period: 'Application period',
  issue_prep: 'Issue prep',
  live: 'Live',
};

interface HackathonDetailProps {
  hackathonId: string;
  onBack: () => void;
}

export function HackathonDetail({ hackathonId, onBack }: HackathonDetailProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [nextPhase, setNextPhase] = useState<string>('');
  const [blocking, setBlocking] = useState<HackathonBlockingReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminHackathon(hackathonId);
      setHackathon(res.hackathon);
      setNextPhase(res.next_phase);
      setBlocking(res.blocking_reasons);
    } catch (error) {
      console.error('Failed to load hackathon:', error);
      toast.error('Failed to load hackathon.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const handleTransition = async () => {
    if (!nextPhase) return;
    setIsTransitioning(true);
    try {
      await transitionHackathon(hackathonId, nextPhase);
      toast.success(`Moved to ${PHASE_LABELS[nextPhase] ?? nextPhase}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to transition phase.');
    } finally {
      setIsTransitioning(false);
    }
  };

  if (isLoading || !hackathon) {
    return <div className={`text-center py-16 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className={`flex items-center gap-2 text-[13px] font-semibold transition-colors ${isDark ? 'text-[#c9983a] hover:text-[#e8c571]' : 'text-[#8b6f3a] hover:text-[#c9983a]'}`}
      >
        <ArrowLeft className="w-4 h-4" /> Back to hackathons
      </button>

      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
          isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
        }`}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className={`text-[22px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{hackathon.name}</h2>
            <span
              className={`inline-block mt-1 px-3 py-1 rounded-full text-[12px] font-bold ${
                isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'
              }`}
            >
              {PHASE_LABELS[hackathon.phase] ?? hackathon.phase}
            </span>
          </div>
          {nextPhase && (
            <button
              onClick={handleTransition}
              disabled={isTransitioning || blocking.length > 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Move to {PHASE_LABELS[nextPhase] ?? nextPhase} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {nextPhase && (
          <div className={`rounded-[14px] border p-4 mb-4 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.2] border-white/25'}`}>
            <p className={`text-[12px] font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
              Requirements for {PHASE_LABELS[nextPhase] ?? nextPhase}
            </p>
            {blocking.length === 0 ? (
              <div className={`flex items-center gap-2 text-[13px] ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                <CheckCircle2 className="w-4 h-4" /> Ready to transition.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {blocking.map((b) => (
                  <li key={b.field} className={`flex items-center gap-2 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    <AlertCircle className="w-4 h-4 shrink-0" /> {b.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <HackathonForm hackathon={hackathon} onSaved={load} />
      </div>

      <ApplicationsReview hackathonId={hackathonId} />

      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
          isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
        }`}
      >
        <h3 className={`text-[16px] font-bold mb-4 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>Draws</h3>
        <DrawResults hackathonId={hackathonId} />
      </div>

      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
          isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
        }`}
      >
        <h3 className={`text-[16px] font-bold mb-4 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>Rule overrides for this event</h3>
        <HackathonConfigSettings hackathonId={hackathonId} />
      </div>

      <AuditLog hackathonId={hackathonId} />
    </div>
  );
}
