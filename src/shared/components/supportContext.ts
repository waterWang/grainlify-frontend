import { createContext, useContext } from 'react';

/**
 * The support context, deliberately separate from the panel that implements it.
 *
 * Nothing here imports an icon or any UI. That matters for more than tidiness:
 * eight test files replace `lucide-react` wholesale, so importing the panel
 * module fails on any icon their mock does not list. Keeping the context in a
 * UI-free module means a consumer - or a test wrapper - can reach the context
 * without dragging the panel and its icons in behind it.
 */
export interface SupportContextValue {
  /** Opens the support panel. */
  open: () => void;
}

export const SupportContext = createContext<SupportContextValue | null>(null);

/**
 * Throws rather than silently no-oping outside a provider. A "Get help" button
 * that does nothing when clicked is worse than one that is absent, because to
 * the person clicking it, it looks like the report was sent.
 */
export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext);
  if (!ctx) {
    throw new Error('useSupport must be used inside <SupportProvider>');
  }
  return ctx;
}

/**
 * The accessible name every trigger carries. Defined once because it has
 * already been renamed once, for a duplicate-label collision, and there are
 * now three places that render a trigger.
 */
export const SUPPORT_TRIGGER_LABEL = 'Get help or report a problem';
