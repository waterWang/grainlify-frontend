import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { updateHackathon, type Hackathon } from '../../../shared/api/client';

// datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO string.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FieldDef {
  key: keyof Hackathon;
  label: string;
  type: 'text' | 'datetime-local' | 'number';
}

const FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'announced_at', label: 'Announced at', type: 'datetime-local' },
  { key: 'application_period_start', label: 'Application period start', type: 'datetime-local' },
  { key: 'application_period_end', label: 'Application period end', type: 'datetime-local' },
  { key: 'issue_prep_start', label: 'Issue prep start', type: 'datetime-local' },
  { key: 'starts_at', label: 'Starts at (live)', type: 'datetime-local' },
  { key: 'ends_at', label: 'Ends at', type: 'datetime-local' },
  { key: 'merge_grace_period_hours', label: 'Merge grace period (hours)', type: 'number' },
  // The admin enters what the sponsor is putting in. The platform fee comes
  // off this, and the remainder splits into the contributor and maintainer
  // pools - all derived server-side and shown read-only below. Letting an
  // admin type a pool figure directly would let the recorded fee and the
  // recorded pools disagree.
  { key: 'sponsor_total_usdc', label: 'Sponsor total (USDC)', type: 'number' },
];

interface HackathonFormProps {
  hackathon: Hackathon;
  onSaved: () => void;
}

export function HackathonForm({ hackathon, onSaved }: HackathonFormProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const raw = hackathon[f.key];
      next[f.key] = f.type === 'datetime-local' ? toLocalInputValue(raw as string | null) : String(raw ?? '');
    }
    setValues(next);
  }, [hackathon]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, string | number> = {};
      for (const f of FIELDS) {
        const v = values[f.key];
        if (v === '' || v === undefined) continue;
        if (f.type === 'datetime-local') payload[f.key] = new Date(v).toISOString();
        else if (f.type === 'number') payload[f.key] = Number(v);
        else payload[f.key] = v;
      }
      await updateHackathon(hackathon.id, payload);
      toast.success('Hackathon updated.');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update hackathon.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
            <label className={`block text-[12px] font-medium mb-1.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              {f.label}
            </label>
            <input
              type={f.type}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className={`w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none transition-colors ${
                isDark ? 'bg-white/[0.08] border-white/15 text-[#f5f5f5]' : 'bg-white/[0.15] border-white/25 text-[#2d2820]'
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save fields'}
        </button>
      </div>
    </div>
  );
}
