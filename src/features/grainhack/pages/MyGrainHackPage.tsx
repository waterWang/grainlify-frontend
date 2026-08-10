import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { MyApplications } from '../components/MyApplications';
import { MyAssignments } from '../components/MyAssignments';

type Tab = 'assignments' | 'applications';
const VALID_TABS: Tab[] = ['assignments', 'applications'];

/** A contributor's own GrainHack view. Assignments first: what you're
 * holding right now (and its stale timer) is more urgent than what you've
 * applied for. */
export function MyGrainHackPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: Tab = (() => {
    const fromUrl = searchParams.get('subtab');
    return (VALID_TABS as string[]).includes(fromUrl ?? '') ? (fromUrl as Tab) : 'assignments';
  })();

  const setActiveTab = (tab: Tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('subtab', tab);
    setSearchParams(next);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'assignments', label: 'My assignments' },
    { id: 'applications', label: 'My applications' },
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
              onClick={() => setActiveTab(tab.id)}
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

      <div
        className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
          isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
        }`}
      >
        {activeTab === 'assignments' ? <MyAssignments /> : <MyApplications />}
      </div>
    </div>
  );
}
