import { useEffect, useState } from 'react';
import { siX } from 'simple-icons';
import { Linkedin, Loader2, Gift, CheckCircle2, Clock, XCircle, Upload, ExternalLink, ShieldOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import {
  getSocialFollowStatus,
  submitSocialFollowProof,
  SOCIAL_FOLLOW_PLATFORMS,
  type SocialFollowStatus,
  type SocialFollowPlatform,
} from '../../../../shared/api/client';

function SimpleIconGlyph({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

const PLATFORM_INFO: Record<SocialFollowPlatform, { label: string; icon: React.ReactNode; followUrl: string }> = {
  linkedin: {
    label: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    followUrl: 'https://www.linkedin.com/company/grainlify',
  },
  x: {
    label: 'X',
    icon: <SimpleIconGlyph path={siX.path} className="w-5 h-5" />,
    followUrl: 'https://x.com/grainlify',
  },
};

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

function Card({ children, theme }: { children: React.ReactNode; theme: string }) {
  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
        theme === 'dark' ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
      }`}
    >
      {children}
    </div>
  );
}

/** One badge for the whole submission. There is no per-platform status by
 *  design: both platforms are decided together, so showing them separately
 *  would imply a half-approved state that cannot exist. */
function StatusBadge({ status }: { status: SocialFollowStatus['status'] }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">
        <Clock className="w-3.5 h-3.5" /> Pending review
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-500">
        <XCircle className="w-3.5 h-3.5" /> Not approved
      </span>
    );
  }
  if (status === 'revoked') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-500">
        <ShieldOff className="w-3.5 h-3.5" /> Eligibility withdrawn
      </span>
    );
  }
  return null;
}

function PlatformUploadRow({
  platform,
  picked,
  onPick,
  theme,
}: {
  platform: SocialFollowPlatform;
  picked: boolean;
  onPick: (file: File | null) => void;
  theme: string;
}) {
  const info = PLATFORM_INFO[platform];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please select a PNG, JPG, GIF, or WEBP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error('Screenshot must be under 5MB.');
      e.target.value = '';
      return;
    }
    onPick(file);
    e.target.value = '';
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-[16px] border transition-colors ${
        theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
      }`}
    >
      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/10 text-[#f5efe5]' : 'bg-black/5 text-[#2d2820]'}`}>
        {info.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[15px] font-semibold transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
            {info.label}
          </span>
          <a
            href={info.followUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-[12px] inline-flex items-center gap-1 ${theme === 'dark' ? 'text-[#c9983a] hover:text-[#e8c77f]' : 'text-[#a67c2e] hover:text-[#c9983a]'}`}
          >
            Follow <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {picked && (
          <p className="text-[12px] mt-1 inline-flex items-center gap-1.5 text-green-500">
            <Check className="w-3.5 h-3.5" /> Screenshot ready
          </p>
        )}
      </div>
      <label
        className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-dashed text-[13px] font-medium cursor-pointer transition-colors ${
          theme === 'dark' ? 'border-[#c9983a]/50 bg-white/[0.06] hover:bg-white/[0.1] text-[#d4c5b0]' : 'border-[#c9983a]/50 bg-white/40 hover:bg-white/60 text-[#7a6b5a]'
        }`}
      >
        <Upload className="w-4 h-4" />
        {picked ? 'Replace' : 'Choose screenshot'}
        <input
          type="file"
          accept={VALID_IMAGE_TYPES.join(',')}
          className="hidden"
          aria-label={`${info.label} screenshot`}
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read failed')));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function RewardsTab() {
  const { theme } = useTheme();
  const [socialFollow, setSocialFollow] = useState<SocialFollowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Files are held here until both are present. Nothing is sent until then,
  // which is what makes the submission atomic from the user's side as well as
  // the API's - there is no way to submit one platform on its own.
  const [picked, setPicked] = useState<Partial<Record<SocialFollowPlatform, File>>>({});

  const load = () => getSocialFollowStatus().then(setSocialFollow);

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((error) => {
        console.error('Failed to load social follow status:', error);
        if (!cancelled) toast.error('Failed to load your social follow status.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bothPicked = SOCIAL_FOLLOW_PLATFORMS.every((p) => picked[p]);

  const handleSubmit = async () => {
    if (!bothPicked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const [linkedin, x] = await Promise.all([readAsDataURL(picked.linkedin!), readAsDataURL(picked.x!)]);
      await submitSocialFollowProof({ linkedin, x });
      toast.success('Both screenshots submitted for review.');
      setPicked({});
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit your proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className={`w-6 h-6 animate-spin ${theme === 'dark' ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  if (!socialFollow) {
    return (
      <Card theme={theme}>
        <p className={theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'}>
          Couldn't load your social follow status. Please try again later.
        </p>
      </Card>
    );
  }

  const muted = theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]';
  const strong = theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]';
  // Approved is the only state that needs no further action from them.
  const canSubmit = socialFollow.status !== 'approved';

  return (
    <div className="space-y-6">
      <Card theme={theme}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-[22px] font-bold mb-1 transition-colors ${strong}`}>Social Follow</h2>
            {/* Eligibility, never earning. Following is a requirement to
                receive anything from the Founding Contributor Pool and is
                worth zero shares - saying otherwise would re-make the exact
                fixed-rate promise that was just retired. */}
            <p className={`text-[14px] transition-colors ${muted}`}>
              Following us is required to be eligible for the Founding Contributor Pool. Upload a
              screenshot for each platform and submit them together. It earns no shares by itself —
              it's a requirement, not a payment.
            </p>
          </div>
        </div>

        {socialFollow.submitted && (
          <div
            className={`mb-6 p-4 rounded-[16px] border ${
              theme === 'dark' ? 'bg-white/[0.04] border-white/10' : 'bg-white/[0.15] border-white/25'
            }`}
          >
            <StatusBadge status={socialFollow.status} />
            {/* Why, not just what. A withdrawal or rejection with no stated
                reason reads as arbitrary, and the contributor cannot act on
                it. */}
            {socialFollow.decision_reason && (
              <p className={`text-[13px] mt-2 ${muted}`}>{socialFollow.decision_reason}</p>
            )}
            {socialFollow.status === 'revoked' && (
              <p className={`text-[13px] mt-2 ${muted}`}>
                You can follow again and submit new screenshots to become eligible.
              </p>
            )}
          </div>
        )}

        {canSubmit && (
          <>
            <div className="space-y-3">
              {SOCIAL_FOLLOW_PLATFORMS.map((platform) => (
                <PlatformUploadRow
                  key={platform}
                  platform={platform}
                  picked={Boolean(picked[platform])}
                  onPick={(file) => setPicked((prev) => ({ ...prev, [platform]: file ?? undefined }))}
                  theme={theme}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className={`text-[13px] ${muted}`}>
                {bothPicked
                  ? 'Both screenshots ready.'
                  : 'Choose a screenshot for each platform — they are submitted together.'}
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!bothPicked || isSubmitting}
                className={`shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[12px] font-semibold text-[14px] transition-all ${
                  bothPicked && !isSubmitting
                    ? 'bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_10px_30px_rgba(162,121,44,0.5)]'
                    : 'opacity-50 cursor-not-allowed ' +
                      (theme === 'dark' ? 'bg-white/10 text-[#b8a898]' : 'bg-black/10 text-[#7a6b5a]')
                }`}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? 'Submitting…' : 'Submit both for review'}
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
