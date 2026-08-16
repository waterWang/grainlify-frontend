import { useEffect, useState } from 'react';
import { BookOpen, Clock, ExternalLink, LifeBuoy } from 'lucide-react';
import { SupportForm } from '../../../shared/components/SupportForm';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { getMySupportRequests, type MySupportRequest } from '../../../shared/api/client';

/**
 * Support as a page rather than an overlay.
 *
 * The form is the same SupportForm the modal mounts - not a copy. The modal
 * still exists for /signin and /signup, where somebody who cannot sign in has
 * no dashboard route to reach; that person is the one most likely to need
 * support, which is why the backend accepts anonymous reports at all.
 *
 * The history section exists because the only way to find out what you already
 * sent is to ask in Telegram.
 */

const DOC_LINKS = [
  {
    title: 'Claiming a founding spot',
    description: 'What the Founding Contributor Pool is, who is eligible, and how shares are allocated.',
    href: 'https://docs.grainlify.com/docs/founding-pool',
  },
  {
    title: 'Registering a project',
    description: 'Installing the GitHub App and what happens to the repositories it can see.',
    href: 'https://docs.grainlify.com/docs/getting-started',
  },
  {
    title: 'Identity verification',
    description: 'What verification asks for, how long it takes, and what happens if a check is flagged.',
    href: 'https://docs.grainlify.com/docs/reference/kyc',
  },
  {
    title: 'Referrals',
    description: 'How referral credit is attributed and when it counts.',
    href: 'https://docs.grainlify.com/docs/reference/referrals',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  kyc: 'Verification',
  idea: 'Idea',
  help: 'Help',
  other: 'Other',
};

export function SupportPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [history, setHistory] = useState<MySupportRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getMySupportRequests();
      setHistory(res.support_requests ?? []);
      setTotal(res.total ?? res.support_requests?.length ?? 0);
      setHistoryError(null);
    } catch (e) {
      // The form above still works when this fails. Saying so matters: a bare
      // error where a list should be reads as "support is broken, do not
      // bother reporting anything".
      setHistoryError(e instanceof Error ? e.message : 'Could not load your past reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const card = `backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
    isDark ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
  }`;
  const heading = isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  const muted = isDark ? 'text-[#b8a898]' : 'text-[#6b5d4d]';

  return (
    <div className="space-y-6">
      <div className={`${card} p-6 md:p-8`}>
        <div className="flex items-center gap-3 mb-1">
          <LifeBuoy className={`w-5 h-5 ${isDark ? 'text-[#e8c77f]' : 'text-[#a2792c]'}`} />
          <h1 className={`text-[20px] font-bold ${heading}`}>Get help</h1>
        </div>
        <p className={`text-[14px] mb-6 ${muted}`}>
          Tell us what you need. Verification questions go to the team privately, never to a public channel.
        </p>
        <SupportForm onDone={() => void loadHistory()} onSubmitted={() => void loadHistory()} />
      </div>

      <div className={`${card} p-6 md:p-8`}>
        <div className="flex items-center gap-3 mb-1">
          <Clock className={`w-5 h-5 ${isDark ? 'text-[#e8c77f]' : 'text-[#a2792c]'}`} />
          <h2 className={`text-[16px] font-bold ${heading}`}>Your reports</h2>
        </div>
        <p className={`text-[13px] mb-4 ${muted}`}>
          Quote the support ID if you follow up.
          {/* Truncation is stated, never implied. A partial list shown as a
              complete one is worse than no list: somebody concludes a report
              was never received. The server sends the true total, so this is
              exact rather than inferred from the page being full - which is
              wrong at exactly the limit. */}
          {total > history.length && (
            <> Showing your {history.length} most recent of {total}.</>
          )}
        </p>

        {loading ? (
          <p className={`text-[13px] ${muted}`}>Loading…</p>
        ) : historyError ? (
          <p className={`text-[13px] ${isDark ? 'text-[#e8a0a0]' : 'text-[#a33]'}`}>
            {historyError} The form above still works.
          </p>
        ) : history.length === 0 ? (
          <p className={`text-[13px] ${muted}`}>You haven’t sent anything yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((r) => (
              <li
                key={r.id}
                className={`rounded-[16px] border p-4 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/40 border-white/30'}`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[13px] font-semibold ${heading}`}>
                    {CATEGORY_LABELS[r.category] ?? r.category}
                  </span>
                  <span className={`text-[12px] ${muted}`}>
                    {new Date(r.created_at).toLocaleDateString(undefined, {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </span>
                  {/* "Received" is the only state the system actually knows.
                      Nothing records that a report was read or answered, so
                      nothing here says it was. */}
                  <span className={`text-[12px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.08] text-[#d4c5b0]' : 'bg-white/60 text-[#4a3d2a]'}`}>
                    Received
                  </span>
                  {!r.delivered_to_team && (
                    <span className={`text-[12px] px-2 py-0.5 rounded-full ${isDark ? 'bg-[#5a3a1a] text-[#f0c98a]' : 'bg-[#f6e3c4] text-[#7a5320]'}`}>
                      Team alert didn’t go through — quote this ID
                    </span>
                  )}
                </div>
                <p className={`text-[13px] mb-2 whitespace-pre-wrap break-words ${muted}`}>{r.message}</p>
                <code className={`text-[11px] ${muted}`}>{r.id}</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`${card} p-6 md:p-8`}>
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className={`w-5 h-5 ${isDark ? 'text-[#e8c77f]' : 'text-[#a2792c]'}`} />
          <h2 className={`text-[16px] font-bold ${heading}`}>Before you ask</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {DOC_LINKS.map((d) => (
            <a
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noreferrer"
              className={`group rounded-[16px] border p-4 transition-colors ${
                isDark ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]' : 'bg-white/40 border-white/30 hover:bg-white/60'
              }`}
            >
              <span className={`flex items-center gap-1.5 text-[13px] font-semibold mb-1 ${heading}`}>
                {d.title}
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </span>
              <span className={`block text-[12px] ${muted}`}>{d.description}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
