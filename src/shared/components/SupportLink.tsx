import { LifeBuoy } from 'lucide-react';
import { useSupport, SUPPORT_TRIGGER_LABEL } from './supportContext';

/**
 * An inline "Get help" trigger for pages with no icon rail.
 *
 * Deliberately in the normal flow rather than pinned to a corner. The floating
 * bottom-right button this replaces was reported three times for sitting on
 * top of whatever the page ended with, and that corner is where applications
 * put their primary action - occupying it is picking a fight with every future
 * layout for no benefit.
 *
 * It matters most on the sign-in page. Somebody who cannot sign in is exactly
 * the person most likely to need support, which is why the backend accepts
 * anonymous reports at all - it parses the JWT when present and records the
 * report either way rather than returning 401. Dropping the trigger from these
 * routes would remove the reporting path for precisely those people.
 */
export function SupportLink({ className = '' }: { className?: string }) {
  const { open } = useSupport();
  return (
    <button
      type="button"
      onClick={open}
      aria-label={SUPPORT_TRIGGER_LABEL}
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium text-[#c9983a] hover:text-[#d4af37] transition-colors ${className}`}
    >
      <LifeBuoy className="w-3.5 h-3.5 shrink-0" />
      Get help
    </button>
  );
}
