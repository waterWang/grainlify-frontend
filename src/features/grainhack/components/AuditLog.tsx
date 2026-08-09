import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getHackathonConfigAudit, type HackathonConfigAuditEntry } from '../../../shared/api/client';

interface AuditLogProps {
  /** undefined = every audit entry (global config changes across every
   * hackathon); a real id scopes to just that hackathon (including its
   * phase-transition history, recorded under key='phase'). */
  hackathonId?: string;
}

export function AuditLog({ hackathonId }: AuditLogProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [entries, setEntries] = useState<HackathonConfigAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getHackathonConfigAudit({ hackathon_id: hackathonId, limit: 100 })
      .then((res) => {
        if (!cancelled) setEntries(res.entries);
      })
      .catch((error) => {
        console.error('Failed to load audit log:', error);
        if (!cancelled) toast.error('Failed to load the audit log.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
        isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
      }`}
    >
      <h3 className={`text-[16px] font-bold mb-4 transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
        Audit trail
      </h3>
      {entries.length === 0 ? (
        <div className={`text-center py-8 text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          No changes recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className={`flex items-start gap-3 p-3 rounded-[12px] border ${
                isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.2] border-white/25'
              }`}
            >
              <History className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                  {e.key === 'phase' ? 'Phase transition' : e.key}
                </p>
                <p className={`text-[12px] font-mono ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>
                  {e.old_value || '(unset)'} &rarr; {e.new_value || '(unset)'}
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
                  {e.actor_login ? `@${e.actor_login}` : 'unknown actor'} &middot;{' '}
                  {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
