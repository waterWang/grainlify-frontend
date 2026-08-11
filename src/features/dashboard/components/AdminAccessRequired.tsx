import { Shield } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface AdminAccessRequiredProps {
  /** What the user was trying to open, e.g. "the Data page". */
  surface: string;
  onAuthenticate: () => void;
}

/**
 * Shown in place of an admin surface when the signed-in user does not hold the
 * admin role.
 *
 * The point of this component is that it is *shown at all*. The Data page had
 * no such fallback: it rendered on `adminAuthenticated`, a sessionStorage flag
 * set only by a password modal that the role switch no longer opens, so an
 * admin clicking Data got an empty page — no page, no message, no way to tell
 * whether it was a permission problem or a crash.
 *
 * Two other admin surfaces already rendered a panel like this one inline. This
 * is that panel, extracted, so a fourth admin page cannot be added with the
 * fallback quietly left out again.
 */
export function AdminAccessRequired({ surface, onAuthenticate }: AdminAccessRequiredProps) {
  const { theme } = useTheme();
  const darkTheme = theme === 'dark';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className={`text-center p-8 rounded-[24px] backdrop-blur-[40px] border max-w-[420px] ${
          darkTheme
            ? 'bg-white/[0.08] border-white/10 text-[#d4d4d4]'
            : 'bg-white/[0.15] border-white/25 text-[#7a6b5a]'
        }`}
      >
        <Shield className="w-16 h-16 mx-auto mb-4 text-[#c9983a]" />
        <h2
          className={`text-2xl font-bold mb-2 ${darkTheme ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}
        >
          Admin Access Required
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed">
          Your account does not currently hold the admin role, so {surface} is not
          available. If you have the admin password, you can authenticate here.
        </p>
        <button
          onClick={onAuthenticate}
          className="px-6 py-3 bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white rounded-[16px] font-semibold text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_10px_30px_rgba(162,121,44,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9983a] transition-all"
        >
          Authenticate
        </button>
      </div>
    </div>
  );
}
