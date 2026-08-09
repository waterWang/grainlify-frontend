import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { HackathonList } from '../components/HackathonList';
import { HackathonDetail } from '../components/HackathonDetail';
import { HackathonConfigSettings } from '../components/HackathonConfigSettings';
import { AuditLog } from '../components/AuditLog';

type GrainHackTab = 'hackathons' | 'global-settings' | 'global-audit';
const VALID_TABS: GrainHackTab[] = ['hackathons', 'global-settings', 'global-audit'];

export function GrainHackAdminPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  // Mirrors SettingsPage.tsx's own ?subtab= convention so the active tab
  // survives a reload.
  const activeTab: GrainHackTab = (() => {
    const fromUrl = searchParams.get('subtab');
    return (VALID_TABS as string[]).includes(fromUrl ?? '') ? (fromUrl as GrainHackTab) : 'hackathons';
  })();
  const setActiveTab = (tab: GrainHackTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('subtab', tab);
    setSearchParams(next);
  };

  const [selectedHackathonId, setSelectedHackathonId] = useState<string | null>(null);

  const tabs: { id: GrainHackTab; label: string }[] = [
    { id: 'hackathons', label: 'Hackathons' },
    { id: 'global-settings', label: 'Global Defaults' },
    { id: 'global-audit', label: 'Global Audit' },
  ];

  return (
    <div className="space-y-6">
      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-colors ${
          isDark ? 'bg-[#2d2820]/[0.4] border-white/10' : 'bg-white/[0.12] border-white/20'
        }`}
      >
        <div className="flex items-center gap-2 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'hackathons') setSelectedHackathonId(null);
              }}
              className={`px-6 py-3 rounded-[16px] text-[14px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#a2792c] text-white shadow-[0_4px_16px_rgba(162,121,44,0.25)]'
                  : isDark
                    ? 'text-[#d4c5b0] hover:bg-white/[0.1]'
                    : 'text-[#6b5d4d] hover:bg-white/[0.1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'hackathons' &&
        (selectedHackathonId ? (
          <HackathonDetail hackathonId={selectedHackathonId} onBack={() => setSelectedHackathonId(null)} />
        ) : (
          <HackathonList onSelect={setSelectedHackathonId} />
        ))}

      {activeTab === 'global-settings' && (
        <div
          className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
            isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
          }`}
        >
          <h2 className={`text-[20px] font-bold mb-1 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>Global defaults</h2>
          <p className={`text-[13px] mb-4 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
            Applied to any new hackathon unless overridden per-event.
          </p>
          <HackathonConfigSettings />
        </div>
      )}

      {activeTab === 'global-audit' && <AuditLog />}
    </div>
  );
}
