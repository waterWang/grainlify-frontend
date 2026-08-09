import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ConfigSection } from './ConfigSection';
import { ConfigRow } from './ConfigRow';
import {
  getHackathonConfigSettings,
  updateHackathonConfigSetting,
  resetHackathonConfigSetting,
  type HackathonConfigSetting,
} from '../../../shared/api/client';

const SECTION_ORDER = [
  'Hackathon setup',
  'Issue intake',
  'Contributor slots and caps',
  'Slot-freeing definition',
  'Hard gates',
  'Application window and draw',
  'Newcomer reservation',
  'Draw weights',
  'Judging and payout',
  'Maintainer pool',
  'Models',
];

interface HackathonConfigSettingsProps {
  /** undefined = editing global defaults (AI-specs.md §3.1's "global
   * defaults" scope). A real id = editing that hackathon's overrides. */
  hackathonId?: string;
}

export function HackathonConfigSettings({ hackathonId }: HackathonConfigSettingsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [settings, setSettings] = useState<HackathonConfigSetting[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await getHackathonConfigSettings(hackathonId);
      setSettings(res.settings);
      const map: Record<string, string> = {};
      for (const s of res.settings) map[s.key] = s.value;
      setValues(map);
      setInitialValues(map);
    } catch (error) {
      console.error('Failed to load config settings:', error);
      toast.error('Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changedKeys = Object.keys(values).filter((k) => values[k] !== initialValues[k]);
      for (const key of changedKeys) {
        await updateHackathonConfigSetting({ hackathon_id: hackathonId ?? null, key, value: values[key] });
      }
      toast.success(`Saved ${changedKeys.length} setting${changedKeys.length === 1 ? '' : 's'}.`);
      await fetchSettings();
    } catch (error) {
      console.error('Failed to save config settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    if (!hackathonId) return;
    try {
      await resetHackathonConfigSetting({ hackathon_id: hackathonId, key });
      toast.success('Reset to default.');
      await fetchSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset setting.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-[#c9983a]' : 'text-[#a2792c]'}`} />
      </div>
    );
  }

  const sections = SECTION_ORDER.map((section) => ({
    section,
    settings: settings.filter((s) => s.section === section),
  })).filter((s) => s.settings.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={`text-[13px] transition-colors ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          {hackathonId
            ? "Overrides for this hackathon. Unset fields fall back to the global default."
            : 'Global defaults, applied to any new hackathon.'}
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="px-6 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {sections.map(({ section, settings: sectionSettings }) => (
        <ConfigSection key={section} title={section}>
          {sectionSettings.map((s, idx) => (
            <ConfigRow
              key={s.key}
              setting={s}
              value={values[s.key] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [s.key]: v }))}
              onReset={hackathonId && s.overridden ? () => handleReset(s.key) : undefined}
              showBorder={idx < sectionSettings.length - 1}
            />
          ))}
        </ConfigSection>
      ))}
    </div>
  );
}
