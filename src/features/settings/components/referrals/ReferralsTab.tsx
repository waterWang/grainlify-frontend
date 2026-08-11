import { useEffect, useState } from 'react';
import { Copy, CheckCircle2, Loader2, Gift, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getReferralStats, type ReferralStats } from '../../../../shared/api/client';

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const { theme } = useTheme();
  return (
    <div
      className={`backdrop-blur-[30px] rounded-[16px] border p-5 transition-colors ${
        theme === 'dark' ? 'bg-[#3d342c]/[0.4] border-white/10' : 'bg-white/[0.2] border-white/25'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a2792c]'}>{icon}</span>
        <span
          className={`text-[13px] font-medium transition-colors ${
            theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}
        >
          {label}
        </span>
      </div>
      <p
        className={`text-[28px] font-bold transition-colors ${
          theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p
        className={`text-[13px] font-medium mb-2 transition-colors ${
          theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        }`}
      >
        {label}
      </p>
      <div
        className={`flex items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors ${
          theme === 'dark' ? 'bg-[#1a1512]/[0.5] border-white/10' : 'bg-white/[0.3] border-white/30'
        }`}
      >
        <code
          className={`flex-1 text-[14px] font-mono truncate transition-colors ${
            theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}
        >
          {value}
        </code>
        <button
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={`shrink-0 p-2 rounded-[8px] transition-colors ${
            theme === 'dark' ? 'hover:bg-white/[0.1]' : 'hover:bg-black/[0.05]'
          }`}
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
          ) : (
            <Copy className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'}`} />
          )}
        </button>
      </div>
    </div>
  );
}

export function ReferralsTab() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getReferralStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((error) => {
        console.error('Failed to load referral stats:', error);
        if (!cancelled) toast.error('Failed to load your referral info.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 text-center transition-colors ${
          theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10 text-[#d4c5b0]' : 'bg-white/[0.12] border-white/20 text-[#7a6b5a]'
        }`}
      >
        Couldn't load your referral info. Please try again later.
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/?ref=${stats.code}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
          theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
        }`}
      >
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className={`text-[28px] font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}
            >
              Referral Program
            </h2>
            <p
              className={`text-[14px] transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}
            >
              {/* The points programme is retired. Referrals now earn shares in
                  the Founding Contributor Pool, and a share's value is not
                  knowable until settlement - so nothing here quotes a number
                  a person could plan around. */}
              Share your link. When someone joins through it and completes GitHub sign-in + identity
              verification, your referral counts toward the Founding Contributor Pool. They earn you
              more if they go on to ship merged work.
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <CopyField label="Your referral code" value={stats.code} />
          <CopyField label="Your referral link" value={shareUrl} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Users className="w-4 h-4" />} label="Total Referred" value={stats.total_referred} />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Pending" value={stats.pending} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={stats.completed} />
          {/* Was "Points Earned". Points are retired, and shares are not
              shown as a running total because they are only meaningful once
              the pool is divided. */}
        </div>
      </div>
    </div>
  );
}
