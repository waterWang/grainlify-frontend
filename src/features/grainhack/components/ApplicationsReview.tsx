import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalFooter, ModalButton, ModalInput } from '../../../shared/components/ui/Modal';
import { ApplicationSignalsPanel } from './ApplicationSignalsPanel';
import {
  getAdminHackathonApplications,
  acceptHackathonApplication,
  rejectHackathonApplication,
  requestMoreInfoHackathonApplication,
  type HackathonApplication,
} from '../../../shared/api/client';

interface ApplicationsReviewProps {
  hackathonId: string;
}

export function ApplicationsReview({ hackathonId }: ApplicationsReviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [applications, setApplications] = useState<HackathonApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ app: HackathonApplication; action: 'reject' | 'more_info' } | null>(null);
  const [reason, setReason] = useState('');

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminHackathonApplications(hackathonId, 'pending');
      setApplications(res.applications);
    } catch (error) {
      console.error('Failed to fetch hackathon applications:', error);
      toast.error('Failed to load pending applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathonId]);

  const handleAccept = async (app: HackathonApplication) => {
    setActioningId(app.id);
    try {
      await acceptHackathonApplication(app.id);
      toast.success(`Accepted ${app.project_full_name}.`);
      await fetchApplications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept application.');
    } finally {
      setActioningId(null);
    }
  };

  const handleReview = async () => {
    if (!reviewing) return;
    if (!reason.trim()) return; // submit button is disabled in this state, this is a defensive guard
    setActioningId(reviewing.app.id);
    try {
      if (reviewing.action === 'reject') {
        await rejectHackathonApplication(reviewing.app.id, reason.trim());
        toast.success('Application rejected.');
      } else {
        await requestMoreInfoHackathonApplication(reviewing.app.id, reason.trim());
        toast.success('Requested more info from the applicant.');
      }
      setReviewing(null);
      setReason('');
      await fetchApplications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review.');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div
      className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 transition-colors ${
        isDark ? 'bg-white/[0.08] border-white/10' : 'bg-white/[0.15] border-white/20'
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-[16px] font-bold transition-colors ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
          Pending project applications
        </h3>
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>Loading...</div>
      ) : applications.length === 0 ? (
        <div className={`text-center py-12 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>No pending applications.</div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const expanded = expandedId === app.id;
            return (
              <div
                key={app.id}
                className={`rounded-[16px] border overflow-hidden ${
                  isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white/[0.12] border-white/20'
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => setExpandedId(expanded ? null : app.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-[14px] font-semibold ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
                      {app.project_full_name}
                    </p>
                    <p className={`text-[12px] mt-0.5 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
                      {app.short_description}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(expanded ? null : app.id)}
                      className={`p-2 rounded-[10px] transition-all ${isDark ? 'hover:bg-white/[0.1] text-[#b8a898]' : 'hover:bg-black/[0.05] text-[#7a6b5a]'}`}
                      title={expanded ? 'Collapse' : 'Expand'}
                    >
                      {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleAccept(app)}
                      disabled={actioningId === app.id}
                      className={`p-2 rounded-[10px] transition-all ${isDark ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-500/30 text-green-600'} disabled:opacity-50`}
                      title="Accept"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setReviewing({ app, action: 'more_info' })}
                      disabled={actioningId === app.id}
                      className={`p-2 rounded-[10px] transition-all ${isDark ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-amber-500/30 text-amber-600'} disabled:opacity-50`}
                      title="Request more info"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setReviewing({ app, action: 'reject' })}
                      disabled={actioningId === app.id}
                      className={`p-2 rounded-[10px] transition-all ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-500/30 text-red-600'} disabled:opacity-50`}
                      title="Reject"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-white/10' : 'border-white/20'}`}>
                    <div className="grid grid-cols-2 gap-4 mb-3 text-[12px]">
                      <div>
                        <span className={isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}>Goal: </span>
                        <span className={isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}>{app.goal}</span>
                      </div>
                      <div>
                        <span className={isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}>Expected issues: </span>
                        <span className={isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}>{app.expected_issue_count}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={isDark ? 'text-[#8a7e70]' : 'text-[#9a8b7a]'}>Maintainer contact: </span>
                        <span className={isDark ? 'text-[#d4d4d4]' : 'text-[#4a3f2f]'}>{app.maintainer_contact}</span>
                      </div>
                    </div>
                    <ApplicationSignalsPanel applicationId={app.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!reviewing}
        onClose={() => { setReviewing(null); setReason(''); }}
        title={reviewing?.action === 'reject' ? 'Reject application' : 'Request more info'}
        icon={reviewing?.action === 'reject' ? <XCircle className="w-6 h-6 text-[#c9983a]" /> : <HelpCircle className="w-6 h-6 text-[#c9983a]" />}
        width="md"
      >
        <div className="space-y-4">
          <ModalInput
            label="Reason"
            required
            value={reason}
            onChange={setReason}
            placeholder="Shown to the applicant - be specific about what's missing or wrong."
            rows={3}
          />
          <ModalFooter>
            <ModalButton onClick={() => { setReviewing(null); setReason(''); }}>Cancel</ModalButton>
            <ModalButton variant="primary" onClick={handleReview} disabled={!!actioningId || !reason.trim()}>
              {actioningId ? 'Submitting...' : reviewing?.action === 'reject' ? 'Reject' : 'Request info'}
            </ModalButton>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
