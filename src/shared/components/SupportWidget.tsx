import { useState, type ReactNode } from 'react';
import { SupportContext } from './supportContext';
import { SupportForm } from './SupportForm';

export { useSupport, SUPPORT_TRIGGER_LABEL } from './supportContext';
import { LifeBuoy } from 'lucide-react';
import { Modal, ModalButton } from './ui/Modal';

export function SupportProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SupportContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}

      {/* The modal shell. It owns opening, closing and the Cancel button;
          everything about the report itself lives in SupportForm, which the
          /dashboard support page mounts too. One form, two shells - a second
          copy would drift, which is exactly what happened to the rail icon
          when it had no shared definition.

          Portaled to document.body by Modal. Load-bearing rather than
          incidental: the sidebar rail carries backdrop-blur-[90px], and a
          backdrop-filter establishes a containing block for position: fixed
          descendants, so a panel rendered inside it would be clipped to a 65px
          column. Same trap as #996, same fix. */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Get help"
        icon={<LifeBuoy className="w-4 h-4 md:w-5 md:h-5" />}
        width="md"
      >
        <SupportForm
          autoFocusMessage
          onDone={() => setIsOpen(false)}
          secondaryAction={
            <ModalButton type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </ModalButton>
          }
        />
      </Modal>
    </SupportContext.Provider>
  );
}
