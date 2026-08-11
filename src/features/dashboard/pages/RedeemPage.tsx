import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, Wallet2, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import grainlifyCoin from '../../../assets/grainlify_coin.svg';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { TokenOnStellarIcon } from '../../../shared/components/icons/TokenIcons';
import {
  getPointsBalance,
  getMyRedemptions,
  createRedemption,
  type PointsBalance,
  type Redemption,
} from '../../../shared/api/client';

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-500">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">
      <Clock className="w-3.5 h-3.5" /> Pending
    </span>
  );
}

/** The points programme is retired and the backend refuses new redemption
 *  requests (410 Gone). Mirrored here so the UI never offers an action the
 *  API will reject. Flip both together if it is ever reopened. */
const REDEMPTIONS_CLOSED = true;

export function RedeemPage() {
  const { theme } = useTheme();
  const darkTheme = theme === 'dark';

  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [points, setPoints] = useState('');
  const [wallet, setWallet] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadAll = () =>
    Promise.all([getPointsBalance(), getMyRedemptions()]).then(([b, r]) => {
      setBalance(b);
      setRedemptions(r.redemptions);
    });

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .catch((error) => {
        console.error('Failed to load redemption data:', error);
        if (!cancelled) toast.error('Failed to load your points balance.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pointsValue = parseInt(points, 10) || 0;
  const usdcValue = balance ? pointsValue * balance.usdc_per_point : 0;
  const trimmedWallet = wallet.trim();
  // Light client-side sanity check only - the backend does the real
  // strkey validation. This just gives faster feedback while typing.
  const walletLooksValid = /^G[A-Z2-7]{55}$/.test(trimmedWallet);

  const cta = useMemo(() => {
    // The backend refuses new redemptions outright, so every validation
    // branch below would only lead someone to a request that cannot
    // succeed. Saying so on the button is kinder than letting them fill the
    // form in and discover it at submit. The rest is left intact rather than
    // deleted so this page still works if the programme is ever reopened.
    if (REDEMPTIONS_CLOSED) return { label: 'Redemptions are closed', disabled: true };
    if (!balance) return { label: 'Loading...', disabled: true };
    if (pointsValue <= 0) return { label: 'Enter an amount', disabled: true };
    if (pointsValue < balance.min_redemption_points) {
      return { label: `Minimum ${balance.min_redemption_points.toLocaleString()} points`, disabled: true };
    }
    if (pointsValue > balance.balance) return { label: 'Insufficient points', disabled: true };
    if (!trimmedWallet) return { label: 'Enter your Stellar wallet address', disabled: true };
    if (!walletLooksValid) return { label: 'Enter a valid Stellar address', disabled: true };
    return { label: 'Redeem', disabled: false };
  }, [balance, pointsValue, trimmedWallet, walletLooksValid]);

  const handleRedeem = async () => {
    if (cta.disabled || isRedeeming) return;
    setIsRedeeming(true);
    try {
      await createRedemption(pointsValue, trimmedWallet);
      toast.success('Redemption request submitted.');
      setPoints('');
      setWallet('');
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit redemption.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const panelBg = darkTheme ? 'bg-white/[0.05]' : 'bg-black/[0.03]';
  const labelColor = darkTheme ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const valueColor = darkTheme ? 'text-[#f5efe5]' : 'text-[#2d2820]';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`w-6 h-6 animate-spin ${darkTheme ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  // The points programme is retired: the backend refuses new redemptions
  // outright, so the swap card below can no longer succeed. Rather than let
  // someone fill it in and hit a wall, the page leads with what happened and
  // where rewards live now. The card stays visible but disabled, because a
  // balance that silently vanishes reads worse than one shown as frozen.
  return (
    <div className="max-w-[520px] mx-auto py-4 md:py-8">
      <div className="text-center mb-6">
        <h1 className={`text-[28px] md:text-[32px] font-bold mb-2 transition-colors ${valueColor}`}>Redeem Points</h1>
        <p className={`text-[14px] transition-colors ${labelColor}`}>
          The points programme has been retired.
        </p>
      </div>

      <div
        className={`rounded-[20px] border p-5 mb-6 transition-colors ${
          darkTheme
            ? 'bg-[#c9983a]/[0.08] border-[#c9983a]/25'
            : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'
        }`}
      >
        <p className={`text-[14px] font-bold mb-2 ${valueColor}`}>
          Rewards have moved to the Founding Contributor Pool
        </p>
        <p className={`text-[13px] leading-relaxed ${labelColor}`}>
          Points can no longer be earned or redeemed. Rewards are now shares in a single
          fixed pool, earned mostly by getting pull requests merged, and shared out at the
          end of the first GrainHack. No points were ever awarded and no redemption was
          ever paid, so nothing has been taken from anyone.
        </p>
        <a
          href="https://docs.grainlify.com/docs/rewards"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block mt-3 text-[13px] font-semibold underline ${
            darkTheme ? 'text-[#e8c571]' : 'text-[#8b6f3a]'
          }`}
        >
          How rewards work now
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className={`rounded-[28px] border backdrop-blur-[40px] p-2 shadow-[0_16px_48px_rgba(0,0,0,0.16)] transition-colors ${
          darkTheme ? 'bg-[#2d2820]/[0.5] border-white/10' : 'bg-white/[0.5] border-white/40'
        }`}
      >
        {/* You redeem */}
        <div className={`rounded-[22px] p-5 transition-colors ${panelBg}`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[12px] font-semibold uppercase tracking-wide transition-colors ${labelColor}`}>You redeem</span>
            <span className={`text-[12px] transition-colors ${labelColor}`}>
              Balance: <span className={valueColor}>{balance?.balance.toLocaleString() ?? 0}</span> pts
              {balance && balance.balance > 0 && (
                <button
                  type="button"
                  onClick={() => setPoints(String(balance.balance))}
                  className={`ml-1.5 font-semibold ${darkTheme ? 'text-[#c9983a] hover:text-[#e8c77f]' : 'text-[#a67c2e] hover:text-[#c9983a]'}`}
                >
                  Max
                </button>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={points}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setPoints(v);
              }}
              placeholder="0"
              aria-label="Points to redeem"
              className={`flex-1 min-w-0 bg-transparent outline-none text-[36px] md:text-[42px] font-bold tabular-nums transition-colors ${valueColor} ${
                darkTheme ? 'placeholder:text-white/20' : 'placeholder:text-black/15'
              }`}
            />
            <div
              className={`shrink-0 flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border transition-colors ${
                darkTheme ? 'bg-[#c9983a]/10 border-[#c9983a]/30' : 'bg-[#c9983a]/[0.06] border-[#c9983a]/25'
              }`}
            >
              <img src={grainlifyCoin} alt="" className="w-8 h-8" />
              <span className={`font-semibold text-[15px] ${darkTheme ? 'text-[#e8c77f]' : 'text-[#a67c2e]'}`}>Points</span>
            </div>
          </div>
        </div>

        {/* Swap direction connector */}
        <div className="relative h-0 flex justify-center">
          <div
            className={`absolute -top-[19px] w-10 h-10 rounded-[13px] flex items-center justify-center bg-gradient-to-br from-[#c9983a] to-[#a67c2e] shadow-[0_4px_12px_rgba(0,0,0,0.25)] ring-4 transition-colors ${
              darkTheme ? 'ring-[#241f18]' : 'ring-[#f3ede4]'
            }`}
          >
            <ArrowDown className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* You receive */}
        <div className={`rounded-[22px] p-5 mt-1 transition-colors ${panelBg}`}>
          <span className={`text-[12px] font-semibold uppercase tracking-wide transition-colors ${labelColor}`}>You receive</span>
          <div className="flex items-center justify-between gap-3 mt-3">
            <motion.span
              key={usdcValue.toFixed(2)}
              initial={{ opacity: 0.4, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-[36px] md:text-[42px] font-bold tabular-nums transition-colors ${valueColor}`}
            >
              {usdcValue.toFixed(2)}
            </motion.span>
            <div
              className={`shrink-0 flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border transition-colors ${
                darkTheme ? 'bg-[#2775CA]/10 border-[#2775CA]/30' : 'bg-[#2775CA]/[0.06] border-[#2775CA]/25'
              }`}
            >
              <TokenOnStellarIcon token="usdc" ringClassName={darkTheme ? 'ring-[#3a3228]' : 'ring-[#f3ede4]'} />
              <span className={`font-semibold text-[15px] ${darkTheme ? 'text-[#7db2ee]' : 'text-[#2775CA]'}`}>USDC</span>
            </div>
          </div>
          <p className={`text-[12px] mt-1.5 transition-colors ${labelColor}`}>on the Stellar network</p>
        </div>
      </motion.div>

      <div className={`flex items-center justify-between px-1.5 mt-3 text-[12px] transition-colors ${labelColor}`}>
        <span>Rate</span>
        {/* No rate is quoted while the programme is retired. Showing the old
            one would advertise a conversion that no longer happens. */}
        <span>Closed</span>
      </div>

      {/* Wallet address */}
      <div className="mt-4">
        <label className={`block text-[13px] font-semibold mb-1.5 transition-colors ${valueColor}`}>Stellar wallet address</label>
        <div className="relative">
          <Wallet2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${labelColor}`} />
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="G..."
            aria-label="Stellar wallet address"
            className={`w-full pl-10 pr-4 py-3 rounded-[14px] border text-[14px] font-mono transition-colors ${
              darkTheme ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#8a7e70]' : 'bg-white/50 border-white/40 text-[#2d2820] placeholder:text-[#a89684]'
            }`}
          />
        </div>
      </div>

      {/* CTA */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={handleRedeem}
        disabled={cta.disabled || isRedeeming}
        className="w-full mt-4 py-4 rounded-[18px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-bold text-[16px] shadow-[0_8px_28px_rgba(162,121,44,0.4)] hover:shadow-[0_12px_36px_rgba(162,121,44,0.5)] transition-shadow disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isRedeeming ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
          </span>
        ) : (
          cta.label
        )}
      </motion.button>

      <p className={`text-center text-[12px] mt-3 transition-colors ${labelColor}`}>
        Minimum {balance?.min_redemption_points ?? 100} points per request - reviewed by an admin before payout.
      </p>

      {/* History */}
      {redemptions.length > 0 && (
        <div className="mt-10">
          <h2 className={`text-[16px] font-bold mb-3 transition-colors ${valueColor}`}>Redemption history</h2>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-4 py-3 rounded-[14px] border text-[13px] transition-colors ${
                  darkTheme ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.4] border-white/30'
                }`}
              >
                <div className={`flex items-center gap-2.5 ${valueColor}`}>
                  <TokenOnStellarIcon
                    token="usdc"
                    className="w-6 h-6"
                    ringClassName={darkTheme ? 'ring-[#241f18]' : 'ring-[#f3ede4]'}
                  />
                  {r.points_spent.toLocaleString()} pts → ${r.usdc_amount} USDC
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
