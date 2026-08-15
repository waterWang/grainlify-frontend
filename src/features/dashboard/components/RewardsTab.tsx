import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { getMyRedemptions, type Redemption } from "../../../shared/api/client";
import { SkeletonLoader } from "../../../shared/components/SkeletonLoader";

// A contributor's own reward payouts, read from /redemptions/me.
//
// This tab previously rendered a hardcoded array of seven payouts against
// React Ecosystem, Next.js, Vue.js, Angular, Svelte and Express.js, dated
// through 2025, with statuses of "Complete" and "Processing" and amounts of
// the literal string "--- undefined". None of it came from anywhere; there was
// no request of any kind in the file.
//
// It said the opposite of what is true. No funded hackathon has run, no
// settlement has ever been computed, and production held zero redemptions in
// any status when the points programme was frozen on 2026-08-11. The empty
// state below is not a placeholder for missing data - it IS the data, and it
// corroborates what we have said publicly rather than contradicting it.
//
// Columns are the ones redemptions actually have. There is deliberately no
// "Project" column: a redemption is points-to-USDC for the account, not per
// repository, and inventing that attribution is how the old table came to name
// projects nobody had contributed to.

function StatusPill({ status, theme }: { status: Redemption["status"]; theme: string }) {
  // Same tone treatment as the social-follow badge: opaque tints in light mode,
  // because an alpha wash over a translucent card composites against something
  // the class name cannot see and lands near-invisible.
  const tones: Record<Redemption["status"], { dark: string; light: string; label: string }> = {
    paid: { dark: "bg-green-500/15 text-green-400", light: "bg-green-100 text-green-800", label: "Paid" },
    pending: { dark: "bg-amber-500/15 text-amber-400", light: "bg-amber-100 text-amber-800", label: "Pending" },
    rejected: { dark: "bg-red-500/15 text-red-300", light: "bg-red-100 text-red-800", label: "Rejected" },
  };
  const tone = tones[status] ?? tones.pending;
  return (
    <span
      className={`inline-flex items-center text-[12px] font-semibold px-2.5 py-1 rounded-full ${
        theme === "dark" ? tone.dark : tone.light
      }`}
    >
      {tone.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Truncates a Stellar address to something readable without implying the
 *  middle is missing data. */
function shortAddress(address: string): string {
  if (!address || address.length <= 12) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function RewardsTab() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyRedemptions()
      .then((data) => {
        if (!cancelled) setRedemptions(data.redemptions ?? []);
      })
      .catch((error) => {
        console.error("Failed to load redemptions:", error);
        if (cancelled) return;
        // Distinguished from "you have none" on purpose. Showing the empty
        // state on a failed request would tell somebody with real payouts that
        // they have none, which is the same class of lie this tab just stopped
        // telling.
        setFailed(true);
        toast.error(error instanceof Error ? error.message : "Failed to load your rewards.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shell = `backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
    isDark ? "bg-[#2d2820]/[0.4] border-white/10" : "bg-white/[0.12] border-white/20"
  }`;
  const strong = isDark ? "text-[#f5efe5]" : "text-[#2d2820]";
  const muted = isDark ? "text-[#b8a898]" : "text-[#4a4038]";

  if (isLoading) {
    return (
      <div className={`${shell} p-8 space-y-3`}>
        {[0, 1, 2].map((i) => (
          <SkeletonLoader key={i} variant="text" height="18px" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className={`${shell} p-8 text-center`}>
        <p className={`text-[14px] ${muted}`}>Couldn't load your rewards. Please try again later.</p>
      </div>
    );
  }

  if (!redemptions || redemptions.length === 0) {
    return (
      <div className={`${shell} p-12 text-center`}>
        <div
          className={`w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center ${
            isDark ? "bg-white/[0.06]" : "bg-black/[0.04]"
          }`}
        >
          <Wallet className={`w-6 h-6 ${muted}`} />
        </div>
        <h3 className={`text-[18px] font-bold mb-2 ${strong}`}>No rewards yet</h3>
        <p className={`text-[14px] max-w-md mx-auto ${muted}`}>
          The first funded hackathon hasn't run. When it does, rewards are decided after the work is
          merged and reviewed — and they'll appear here.
        </p>
      </div>
    );
  }

  const cellHead = `px-4 lg:px-6 py-4 text-left text-[11px] lg:text-[12px] font-semibold uppercase tracking-wider ${muted}`;
  const cell = `px-4 lg:px-6 py-4 text-[13px] lg:text-[14px] ${strong}`;

  return (
    <div className={`${shell} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className={`border-b ${isDark ? "border-white/10" : "border-black/[0.06]"}`}>
              <th className={cellHead}>Date</th>
              <th className={cellHead}>Points spent</th>
              <th className={cellHead}>Amount</th>
              <th className={cellHead}>Wallet</th>
              <th className={cellHead}>Status</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((r) => (
              <tr
                key={r.id}
                className={`border-b last:border-0 ${isDark ? "border-white/[0.06]" : "border-black/[0.04]"}`}
              >
                <td className={cell}>{formatDate(r.created_at)}</td>
                <td className={cell}>{r.points_spent.toLocaleString()}</td>
                {/* usdc_amount arrives as a string straight from numeric::text
                    so the decimal is never rounded through a float. Rendered as
                    given. */}
                <td className={`${cell} font-semibold`}>{r.usdc_amount} USDC</td>
                <td className={`${cell} font-mono text-[12px] ${muted}`} title={r.stellar_wallet_address}>
                  {shortAddress(r.stellar_wallet_address)}
                </td>
                <td className="px-4 lg:px-6 py-4">
                  <StatusPill status={r.status} theme={theme} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
