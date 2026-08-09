import type { ReactNode } from 'react';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface ConfigSectionProps {
  title: string;
  children: ReactNode;
}

export function ConfigSection({ title, children }: ConfigSectionProps) {
  const { theme } = useTheme();
  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
        theme === 'dark' ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
      }`}
    >
      <h3 className={`text-[16px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
