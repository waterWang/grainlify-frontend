import { RotateCcw } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import type { HackathonConfigSetting } from '../../../shared/api/client';

function humanizeKey(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface ConfigRowProps {
  setting: HackathonConfigSetting;
  value: string;
  onChange: (value: string) => void;
  /** Only meaningful (and only rendered) when editing a specific hackathon's
   * overrides, not the global-defaults view - resetting a global default
   * has nothing above it to fall back to. */
  onReset?: () => void;
  showBorder?: boolean;
}

export function ConfigRow({ setting, value, onChange, onReset, showBorder = true }: ConfigRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`grid grid-cols-[1fr_220px] gap-4 py-4 items-start ${
        showBorder ? 'border-b border-white/10' : ''
      } ${setting.active ? '' : 'opacity-60'}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[14px] font-semibold transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
            {humanizeKey(setting.key)}
          </span>
          <code className={`text-[11px] px-1.5 py-0.5 rounded-[4px] ${isDark ? 'bg-white/[0.08] text-[#b8a898]' : 'bg-black/[0.05] text-[#7a6b5a]'}`}>
            {setting.key}
          </code>
          {!setting.active && (
            <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${
              isDark ? 'bg-white/[0.06] text-[#8a7e70]' : 'bg-black/[0.04] text-[#9a8b7a]'
            }`}>
              inactive this event
            </span>
          )}
          {onReset && (
            <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold ${
              isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'
            }`}>
              overridden
            </span>
          )}
        </div>
        <p className={`text-[13px] mt-1 transition-colors ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {setting.description}
        </p>
        {setting.valid_range && (
          <p className={`text-[11px] mt-0.5 transition-colors ${isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}`}>
            Valid: {setting.valid_range} &middot; Default: {setting.default || '(empty)'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        {setting.type === 'bool' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`px-3 py-2 rounded-[10px] border text-[13px] font-medium focus:outline-none ${
              isDark ? 'bg-white/[0.08] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.15] border-white/25 text-[#2d2820]'
            }`}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <input
            type={setting.type === 'int' || setting.type === 'float' || setting.type === 'money' ? 'number' : 'text'}
            step={setting.type === 'float' ? '0.01' : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={setting.default}
            className={`w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none transition-colors ${
              isDark
                ? 'bg-white/[0.08] border-white/15 text-[#f5f5f5] placeholder-[#8a7e70] focus:border-[#c9983a]/40'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#9a8b7a] focus:border-[#c9983a]/40'
            }`}
          />
        )}
        {onReset && (
          <button
            onClick={onReset}
            title="Reset to default"
            className={`p-2 rounded-[10px] transition-all shrink-0 ${
              isDark ? 'hover:bg-white/[0.1] text-[#b8a898]' : 'hover:bg-black/[0.05] text-[#7a6b5a]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
