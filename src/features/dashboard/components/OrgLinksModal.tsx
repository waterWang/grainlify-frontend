import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalInput, ModalFooter, ModalButton } from '../../../shared/components/ui/Modal';
import { updateOrgLinks, type OrgLinks } from '../../../shared/api/client';
import { toast } from 'sonner';

interface OrgLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgLogin: string;
  currentLinks: OrgLinks | null;
  onSubmitted: (links: OrgLinks) => void;
}

// Prefill re-syncs from currentLinks every time the modal opens (a
// useEffect, not a useState initializer) - this modal stays mounted
// continuously on OrgProfilePage the same way RatingModal does, and a
// useState initializer alone wouldn't pick up a fresh save made in an
// earlier open. Mirrors NewProjectSetupModal.tsx's own prefill pattern for
// exactly this reason.
export function OrgLinksModal({ isOpen, onClose, orgLogin, currentLinks, onSubmitted }: OrgLinksModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [telegram, setTelegram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTelegram(currentLinks?.telegram ?? '');
      setLinkedin(currentLinks?.linkedin ?? '');
      setWhatsapp(currentLinks?.whatsapp ?? '');
      setTwitter(currentLinks?.twitter ?? '');
      setDiscord(currentLinks?.discord ?? '');
      setError(null);
    }
  }, [isOpen, currentLinks]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const links: OrgLinks = {
      telegram: telegram.trim() || null,
      linkedin: linkedin.trim() || null,
      whatsapp: whatsapp.trim() || null,
      twitter: twitter.trim() || null,
      discord: discord.trim() || null,
    };
    try {
      // Every field is always sent, including as "" to clear it - this
      // modal has no "leave untouched" concept of its own (every field is
      // always visible and editable), so there's no reason to omit keys the
      // way a partial-update caller would.
      await updateOrgLinks(orgLogin, {
        telegram: links.telegram ?? '',
        linkedin: links.linkedin ?? '',
        whatsapp: links.whatsapp ?? '',
        twitter: links.twitter ?? '',
        discord: links.discord ?? '',
      });
      toast.success('Community links updated.');
      onSubmitted(links);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save links. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit community links" icon={<Link2 className="w-5 h-5 text-[#c9983a]" />} width="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className={`text-[13px] -mt-1 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
          Shown on {orgLogin}'s public profile. Enter a handle (no @ needed) or paste a full link - leave blank to hide.
        </p>

        <ModalInput label="Telegram" value={telegram} onChange={setTelegram} placeholder="e.g. stellopay_official" />
        <ModalInput label="LinkedIn" value={linkedin} onChange={setLinkedin} placeholder="company page handle, or a full linkedin.com URL" />
        <ModalInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="phone number, digits only" />
        <ModalInput label="Twitter / X" value={twitter} onChange={setTwitter} placeholder="e.g. stellopay_hq" />
        <ModalInput label="Discord" value={discord} onChange={setDiscord} placeholder="invite code, or a full discord.gg URL" />

        {error && <div className="text-[12px] font-semibold text-red-400">{error}</div>}

        <ModalFooter>
          <ModalButton type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </ModalButton>
          <ModalButton type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save links'}
          </ModalButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
