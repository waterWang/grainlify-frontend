import { useEffect, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import { getAdminHackathons, createHackathon, type Hackathon } from '../../../shared/api/client';

const PHASE_LABELS: Record<string, string> = {
  draft: 'Draft',
  application_period: 'Application period',
  issue_prep: 'Issue prep',
  live: 'Live',
};

interface HackathonListProps {
  onSelect: (id: string) => void;
}

export function HackathonList({ onSelect }: HackathonListProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchHackathons = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminHackathons();
      setHackathons(res.hackathons);
    } catch (error) {
      console.error('Failed to fetch hackathons:', error);
      toast.error('Failed to load hackathons.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHackathons();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await createHackathon(newName.trim());
      toast.success('Draft hackathon created.');
      setIsCreateOpen(false);
      setNewName('');
      await fetchHackathons();
      onSelect(res.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create hackathon.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
        isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-[20px] font-bold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>Hackathons</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all border border-white/10"
        >
          <Plus className="w-4 h-4" /> New hackathon
        </button>
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>
      ) : hackathons.length === 0 ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
          No hackathons yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {hackathons.map((h) => (
            <button
              key={h.id}
              onClick={() => onSelect(h.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-[16px] border text-left transition-all ${
                isDark ? 'bg-white/[0.06] border-white/10 hover:bg-white/[0.1]' : 'bg-white/[0.12] border-white/20 hover:bg-white/[0.2]'
              }`}
            >
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${isDark ? 'bg-[#c9983a]/20' : 'bg-[#c9983a]/15'}`}>
                <Trophy className="w-5 h-5 text-[#c9983a]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>{h.name}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                  isDark ? 'bg-[#c9983a]/20 text-[#e8c571]' : 'bg-[#c9983a]/20 text-[#8b6f3a]'
                }`}
              >
                {PHASE_LABELS[h.phase] ?? h.phase}
              </span>
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New GrainHack" icon={<Trophy className="w-6 h-6 text-[#c9983a]" />} width="md">
        <div className="space-y-4">
          <ModalInput label="Name" required value={newName} onChange={setNewName} placeholder="e.g. GrainHack Spring 2026" />
          <ModalFooter>
            <ModalButton onClick={() => setIsCreateOpen(false)}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating ? 'Creating...' : 'Create draft'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
