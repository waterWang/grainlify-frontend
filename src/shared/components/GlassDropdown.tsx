import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface GlassDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Number of currently active filters, shown as a small count badge on the
   * trigger button. Hidden when 0/undefined. */
  badgeCount?: number;
}

export function GlassDropdown<T extends string>({ 
  value, 
  onChange, 
  options, 
  isOpen, 
  onToggle, 
  onClose,
  badgeCount,
}: GlassDropdownProps<T>) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const showBadge = typeof badgeCount === 'number' && badgeCount > 0;

  const handleSelect = (option: T) => {
    onChange(option);
    onClose();
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button 
        className={`relative flex items-center gap-2 px-5 py-3 rounded-[14px] backdrop-blur-[25px] border transition-all ${
          isDark
            ? 'bg-white/[0.08] border-white/15 hover:bg-white/[0.12] hover:border-[#e8c571]/30'
            : 'bg-white/[0.15] border-white/25 hover:bg-white/[0.2] hover:border-[#c9983a]/30'
        }`}
        onClick={onToggle}
      >
        <span className={`text-[14px] font-semibold ${
          isDark ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
        }`}>
          {value}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${
          isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
        } ${isOpen ? 'rotate-180' : ''}`} />
        {showBadge && (
          <span
            className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 bg-gradient-to-br from-[#e8c571] to-[#c9983a] rounded-full text-[12px] font-bold text-white flex items-center justify-center"
            data-testid="filter-count-badge"
          >
            {badgeCount}
          </span>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          
          {/* Menu */}
          <div className={`absolute top-full right-0 mt-2 w-48 rounded-[16px] border z-50 overflow-hidden ${
            isDark
              ? 'bg-[#3a3228] border-white/30'
              : 'bg-[#d4c5b0] border-white/40'
          }`}>
            <div className="py-2">
              {options.map((option) => (
                <button
                  key={option}
                  className={`w-full px-5 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                    isDark
                      ? 'text-[#e8dfd0] hover:bg-[#4a3e30]'
                      : 'text-[#2d2820] hover:bg-[#c9b8a0]'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}