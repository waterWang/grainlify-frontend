import { useRef, useState } from 'react';
import { Bug, CheckCircle2, IdCard, Lightbulb, LifeBuoy, Loader2, MessageCircle, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalButton, ModalFooter, ModalInput } from './ui/Modal';
import { useTheme } from '../contexts/ThemeContext';
import { submitSupportRequest, type SupportCategory } from '../api/client';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// The category is the routing decision, made by the person with the problem
// rather than guessed from their wording. Each one has a fixed destination on
// the other side, and `kyc` is the one that matters: it goes to a private DM
// instead of a group anybody can read, so a mis-picked category is a privacy
// outcome, not a filing inconvenience.
//
// The order is deliberate. Bug first because it is the most common and was the
// only option this widget ever had; KYC second because it is the one people are
// currently stuck on and the one they most need to find.
type CategoryOption = {
  value: SupportCategory;
  label: string;
  icon: typeof Bug;
  /** Placeholder for the message box - a question, not an instruction, because
   *  the thing that makes a report useful is the specific detail. */
  placeholder: string;
  /** Shown under the picker. Empty for categories that need no framing. */
  note?: string;
};

const CATEGORIES: CategoryOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    icon: Bug,
    placeholder: 'What did you expect to happen, and what happened instead?',
  },
  {
    value: 'kyc',
    label: 'Verification',
    icon: IdCard,
    placeholder: 'What is your verification stuck on? Include the status you can see.',
    // Two things at once: reassurance, because people ask verification
    // questions reluctantly, and a real instruction - the message is stored
    // and forwarded, so document numbers should not be in it. Nobody needs
    // them to answer "why is mine stuck", and asking for them is what a
    // phishing message would do.
    note: 'Handled privately - this one is never posted to a public channel. Please don\'t include ID numbers or photos of documents; we don\'t need them to help.',
  },
  {
    value: 'idea',
    label: 'Idea',
    icon: Lightbulb,
    placeholder: 'What would you change, and what would it let you do?',
  },
  {
    value: 'help',
    label: 'Help',
    icon: LifeBuoy,
    placeholder: 'What are you trying to do, and where did you get stuck?',
  },
  {
    value: 'other',
    label: 'Other',
    icon: MessageCircle,
    placeholder: 'What would you like to tell us?',
  },
];

// Global, rendered once (mounted in App.tsx next to <Toast />) so it's
// available on the landing page and every dashboard tab alike - support isn't
// limited to signed-in users.
export function SupportWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Which category the submission actually went out as, so the confirmation
  // can't drift if the picker is reset before the panel is read.
  const [submittedAs, setSubmittedAs] = useState<SupportCategory>('bug');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];

  const handleClose = () => {
    setIsOpen(false);
    // Wait out the modal's own close animation before clearing content, so
    // the form doesn't visibly flash to empty before it disappears.
    setTimeout(() => {
      setCategory('bug');
      setMessage('');
      setScreenshot(null);
      setScreenshotName(null);
      setSubmitted(false);
    }, 200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please select a PNG, JPG, GIF, or WEBP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error('Screenshot must be under 5MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshot(reader.result);
        setScreenshotName(file.name);
      }
    };
    reader.onerror = () => toast.error('Failed to read the selected file.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please tell us what you need.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitSupportRequest({
        category,
        message: message.trim(),
        screenshot: screenshot ?? undefined,
        page_url: window.location.href,
      });
      setSubmittedAs(category);
      setSubmitted(true);
    } catch (error) {
      // Deliberately does NOT clear `message`. The backend distinguishes
      // "saved but not yet delivered" (200) from "not saved" (503), and the
      // only path that loses a report is the second one - so on any error the
      // person's text stays in the box and the message they see is the
      // backend's own, which says whether to retry.
      toast.error(error instanceof Error ? error.message : 'Failed to send. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Get help or report a problem"
        className={`fixed bottom-5 right-5 z-[9000] flex items-center justify-center gap-2 w-12 h-12 sm:w-auto sm:px-4 sm:h-12 rounded-full backdrop-blur-[40px] border shadow-[0px_6px_16px_0px_rgba(0,0,0,0.25),0px_0px_4px_0px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-transform ${
          // Light mode reads --brand-gold-text rather than the UI gold. On the
          // translucent white pill this button actually sits on, #a67c2e
          // measured 3.42 - the token exists because gold-as-text is a
          // different problem from gold-as-surface. Dark mode's #e8c77f
          // measures 8.75 and is left alone.
          isDark
            ? 'bg-[#2d2820]/[0.75] border-white/10 text-[#e8c77f]'
            : 'bg-white/[0.75] border-white/40 text-[var(--brand-gold-text)]'
        }`}
      >
        <LifeBuoy className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline text-[13px] font-semibold whitespace-nowrap">Get help</span>
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Get help"
        icon={<LifeBuoy className="w-4 h-4 md:w-5 md:h-5" />}
        width="md"
      >
        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className={`text-[16px] font-semibold ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>
              {submittedAs === 'kyc' ? 'Sent privately' : 'Thanks - we\'ve got it'}
            </p>
            <p className={`text-[14px] max-w-[320px] ${isDark ? 'text-[#b8a898]' : 'text-[#4a3d2a]'}`}>
              {submittedAs === 'kyc'
                ? 'Your verification question went straight to the team, not to any public channel.'
                : 'Our team will take a look.'}
            </p>
            <ModalButton variant="primary" onClick={handleClose} className="mt-2">
              Done
            </ModalButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend className={`block text-[13px] font-medium mb-2 ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3d2a]'}`}>
                What's this about?
              </legend>
              {/* Radios rather than a <select>: five options is few enough to
                  show at once, and the destination differs per option, so the
                  choice shouldn't be hidden behind a tap. min-h-[44px] is the
                  tap-target floor used across the app. */}
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What's this about?">
                {CATEGORIES.map((option) => {
                  const Icon = option.icon;
                  const isSelected = option.value === category;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setCategory(option.value)}
                      className={`flex items-center gap-2 min-h-[44px] px-3.5 rounded-[14px] border text-[13px] font-medium transition-colors ${
                        isSelected
                          ? isDark
                            ? 'bg-[#c9983a]/25 border-[#c9983a]/60 text-[#f5efe5]'
                            : 'bg-[#c9983a]/20 border-[#c9983a]/60 text-[#4a3d2a]'
                          : isDark
                            ? 'bg-white/[0.06] border-white/15 text-[#d4c5b0] hover:bg-white/[0.1]'
                            : 'bg-white/40 border-white/30 text-[#4a3d2a] hover:bg-white/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {selected.note && (
              <p
                className={`mt-3 text-[12px] leading-[1.5] rounded-[12px] px-3 py-2.5 border ${
                  isDark
                    ? 'bg-white/[0.05] border-white/10 text-[#c4b6a4]'
                    : 'bg-white/50 border-white/40 text-[#6b5c4a]'
                }`}
              >
                {selected.note}
              </p>
            )}

            <div className="mt-4">
              <ModalInput
                label={selected.value === 'kyc' ? 'What\'s happening?' : 'Tell us more'}
                value={message}
                onChange={setMessage}
                placeholder={selected.placeholder}
                rows={4}
                required
                autoFocus
              />
            </div>

            <div className="mt-4">
              <label className={`block text-[13px] font-medium mb-2 ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3d2a]'}`}>
                Screenshot <span className="opacity-60 font-normal">(optional)</span>
              </label>
              {screenshot ? (
                <div
                  className={`flex items-center gap-3 p-3 rounded-[14px] border ${
                    isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
                  }`}
                >
                  <img src={screenshot} alt="Screenshot preview" className="w-12 h-12 rounded-[8px] object-cover shrink-0" />
                  <span className={`flex-1 text-[13px] truncate ${isDark ? 'text-[#d4d4d4]' : 'text-[#4a3d2a]'}`}>{screenshotName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotName(null);
                    }}
                    aria-label="Remove screenshot"
                    className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition-colors ${isDark ? 'text-[#b8a898] hover:text-white hover:bg-white/10' : 'text-[#4a3d2a] hover:text-black hover:bg-black/5'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  className={`flex items-center justify-center gap-2 min-h-[44px] p-4 rounded-[14px] border border-dashed cursor-pointer text-[13px] font-medium transition-colors ${
                    isDark
                      ? 'border-[#c9983a]/50 bg-white/[0.04] hover:bg-white/[0.08] text-[#d4c5b0]'
                      : 'border-[#c9983a]/50 bg-white/40 hover:bg-white/60 text-[#4a3d2a]'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Attach a screenshot
                  <input ref={inputRef} type="file" accept={VALID_IMAGE_TYPES.join(',')} className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <ModalFooter>
              <ModalButton type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </ModalButton>
              <ModalButton type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </ModalButton>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </>
  );
}
