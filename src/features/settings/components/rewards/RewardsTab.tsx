import { useEffect, useRef, useState } from 'react';
import { siGithub, siTelegram } from 'simple-icons';
import { Linkedin, Loader2, Gift, CheckCircle2, Clock, XCircle, Upload, ExternalLink } from 'lucide-react';
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

const PLATFORM_INFO: Record<SocialFollowPlatform, { label: string; icon: React.ReactNode; followUrl?: string }> = {
  github: { label: 'GitHub', icon: <SimpleIconGlyph path={siGithub.path} className="w-5 h-5" />, followUrl: 'https://github.com/Grainlify' },
  telegram: { label: 'Telegram', icon: <SimpleIconGlyph path={siTelegram.path} className="w-5 h-5" /> },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-5 h-5" /> },
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

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-500">
        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
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
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return null;
}

function PlatformRow({
  platform,
  status,
  rejectionReason,
  onUpload,
  isUploading,
  theme,
}: {
  platform: SocialFollowPlatform;
  status: string | null;
  rejectionReason?: string;
  onUpload: (file: File) => void;
  isUploading: boolean;
  theme: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
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
    onUpload(file);
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
          {info.followUrl && (
            <a
              href={info.followUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[12px] inline-flex items-center gap-1 ${theme === 'dark' ? 'text-[#c9983a] hover:text-[#e8c77f]' : 'text-[#a67c2e] hover:text-[#c9983a]'}`}
            >
              Follow <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="mt-1.5">
          <StatusBadge status={status} />
          {status === 'rejected' && rejectionReason && (
            <p className={`text-[12px] mt-1 ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>{rejectionReason}</p>
          )}
        </div>
      </div>
      {status !== 'approved' && (
        <label
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-dashed text-[13px] font-medium cursor-pointer transition-colors ${
            theme === 'dark' ? 'border-[#c9983a]/50 bg-white/[0.06] hover:bg-white/[0.1] text-[#d4c5b0]' : 'border-[#c9983a]/50 bg-white/40 hover:bg-white/60 text-[#7a6b5a]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {status === 'rejected' ? 'Re-upload proof' : 'Upload proof'}
          <input ref={inputRef} type="file" accept={VALID_IMAGE_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
}

export function RewardsTab() {
  const { theme } = useTheme();
  const [socialFollow, setSocialFollow] = useState<SocialFollowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingPlatform, setUploadingPlatform] = useState<string | null>(null);

  // No points balance is loaded any more. The programme is retired, so
  // fetching a number whose only purpose was to be converted to USDC would
  // just be a slower way of showing zero.
  const loadAll = () => getSocialFollowStatus().then(setSocialFollow);

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .catch((error) => {
        console.error('Failed to load rewards data:', error);
        if (!cancelled) toast.error('Failed to load your rewards info.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = (platform: SocialFollowPlatform, file: File) => {
    setUploadingPlatform(platform);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        setUploadingPlatform(null);
        return;
      }
      try {
        await submitSocialFollowProof(platform, reader.result);
        toast.success(`${PLATFORM_INFO[platform].label} proof submitted for review.`);
        const status = await getSocialFollowStatus();
        setSocialFollow(status);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to submit proof.');
      } finally {
        setUploadingPlatform(null);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read the selected file.');
      setUploadingPlatform(null);
    };
    reader.readAsDataURL(file);
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
        <p className={theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#7a6b5a]'}>Couldn't load your rewards info. Please try again later.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Social Follow */}
      <Card theme={theme}>
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#d4af37] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(201,152,58,0.4)]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`text-[22px] font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
              Social Follow
            </h2>
            {/* Eligibility, never earning. Following is a requirement to
                receive anything from the Founding Contributor Pool and is
                worth zero shares - saying otherwise would re-make the exact
                fixed-rate promise that was just retired. */}
            <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              Following us is required to be eligible for the Founding Contributor Pool. Upload a
              screenshot for each platform and submit them together. It earns no shares by itself —
              it's a requirement, not a payment.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SOCIAL_FOLLOW_PLATFORMS.map((platform) => {
            const p = socialFollow.platforms.find((x) => x.platform === platform);
            return (
              <PlatformRow
                key={platform}
                platform={platform}
                status={p?.status ?? null}
                rejectionReason={p?.rejection_reason}
                onUpload={(file) => handleUpload(platform, file)}
                isUploading={uploadingPlatform === platform}
                theme={theme}
              />
            );
          })}
        </div>

        {socialFollow.completed && (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-green-500 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Completed - you earned {socialFollow.points_awarded} points.
          </div>
        )}
      </Card>

    </div>
  );
}
