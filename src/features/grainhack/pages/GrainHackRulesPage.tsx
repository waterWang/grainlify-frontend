import { useEffect, useState } from 'react';
import { ScrollText, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getGrainHackRules, type GrainHackRules, type GrainHackRule } from '../../../shared/api/client';

/** The sections worth leading with. AI-specs.md §12: "Publish before each
 * event starts: bucket definitions, draw weights, hard gates, payout floor
 * rule." Everything else still renders, just below these. */
const HEADLINE_SECTIONS = ['Hard gates', 'Draw weights', 'Judging and payout', 'Application window and draw'];

function humanizeKey(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface GrainHackRulesPageProps {
  /** Omit for the global defaults that apply to any new event. */
  hackathonId?: string;
}

/** The published rules for a GrainHack.
 *
 * Renders entirely from the API, which reads live config - or, for an event
 * that has gone live, its frozen §1.1 snapshot. That's the point: a
 * hand-written rules doc drifts from what's actually running the first time
 * anyone changes a value, and a rules page that can be wrong is worse than
 * no rules page. This one can only ever show what the pipeline obeys. */
export function GrainHackRulesPage({ hackathonId }: GrainHackRulesPageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<GrainHackRules | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGrainHackRules(hackathonId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the rules.'));
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  if (error) {
    return <p className={`text-[13px] py-8 text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>;
  }
  if (!data) {
    return <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>;
  }

  const bySection = new Map<string, GrainHackRule[]>();
  for (const r of data.rules) {
    const list = bySection.get(r.section) ?? [];
    list.push(r);
    bySection.set(r.section, list);
  }
  const ordered = [
    ...HEADLINE_SECTIONS,
    ...data.section_order.filter((s) => !HEADLINE_SECTIONS.includes(s)),
    'Other',
  ].filter((s) => (bySection.get(s)?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
          isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="w-5 h-5 text-[#c9983a]" />
          <h1 className={`text-[22px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
            {data.hackathon_name ? `${data.hackathon_name} rules` : 'GrainHack rules'}
          </h1>
        </div>
        <SourceNotice source={data.source} isDark={isDark} />

        <div className={`mt-4 rounded-[14px] border p-4 ${isDark ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'}`}>
          <p className={`flex items-center gap-2 text-[13px] font-bold mb-1 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
            <ShieldCheck className="w-4 h-4 text-[#c9983a]" />
            Prior wins are capped at {data.structural.prior_completion_cap}
          </p>
          <p className={`text-[13px] ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}`}>
            {data.structural.prior_completion_cap_note}
          </p>
        </div>
      </div>

      {ordered.map((section) => (
        <div
          key={section}
          className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
            isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
          }`}
        >
          <h2 className={`text-[16px] font-bold mb-3 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{section}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <tbody>
                {(bySection.get(section) ?? [])
                  .slice()
                  .sort((a, b) => a.key.localeCompare(b.key))
                  .map((r) => (
                    <tr key={r.key} className={`border-t align-top ${isDark ? 'border-white/10' : 'border-black/10'} ${r.active ? '' : 'opacity-60'}`}>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[14px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                            {humanizeKey(r.key)}
                          </span>
                          {!r.active && (
                            <span
                              title="Configured, but no logic reads it yet - don't plan around this value."
                              className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${isDark ? 'bg-white/[0.08] text-[#8a7e70]' : 'bg-black/[0.04] text-[#9a8b7a]'}`}
                            >
                              not in effect yet
                            </span>
                          )}
                        </div>
                        {r.description && (
                          <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>{r.description}</p>
                        )}
                      </td>
                      <td className={`py-2.5 text-right whitespace-nowrap tabular-nums text-[14px] font-semibold ${isDark ? 'text-[#e8c571]' : 'text-[#8b6f3a]'}`}>
                        {r.value === '' ? '—' : r.value}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceNotice({ source, isDark }: { source: GrainHackRules['source']; isDark: boolean }) {
  if (source === 'snapshot') {
    return (
      <p className={`flex items-start gap-2 text-[13px] ${isDark ? 'text-green-400' : 'text-green-700'}`}>
        <Lock className="w-4 h-4 mt-0.5 shrink-0" />
        These rules were frozen when the event went live. Changing the platform defaults now cannot alter
        them - this event runs on its own copy.
      </p>
    );
  }
  if (source === 'not_yet_frozen') {
    return (
      <p className={`flex items-start gap-2 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        This event hasn't started yet, so these rules can still change. They're frozen the moment it goes
        live.
      </p>
    );
  }
  return (
    <p className={`text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
      Platform defaults, applied to any new event unless it overrides them.
    </p>
  );
}
