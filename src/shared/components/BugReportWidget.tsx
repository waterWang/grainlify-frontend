import { useRef, useState } from 'react';
import { Bug, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalButton, ModalFooter, ModalInput } from './ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { submitBugReport } from '../api/client';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const VALID_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

// Global, rendered once (mounted in App.tsx next to <Toast />) so it's
// available on the landing page and every dashboard tab alike - bug reports
// aren't limited to signed-in users.
export function BugReportWidget() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsOpen(false);
    // Wait out the modal's own close animation before clearing content, so
    // the form doesn't visibly flash to empty before it disappears.
    setTimeout(() => {
      setDescription('');
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
    if (!description.trim()) {
      toast.error('Please describe what went wrong.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitBugReport({
        description: description.trim(),
        screenshot: screenshot ?? undefined,
        page_url: window.location.href,
        reporter_login: user?.github?.login,
      });
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Report a bug"
        className={`fixed bottom-5 right-5 z-[9000] flex items-center justify-center gap-2 w-12 h-12 sm:w-auto sm:px-4 sm:h-12 rounded-full backdrop-blur-[40px] border shadow-[0px_6px_16px_0px_rgba(0,0,0,0.25),0px_0px_4px_0px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-transform ${
          isDark ? 'bg-[#2d2820]/[0.75] border-white/10 text-[#e8c77f]' : 'bg-white/[0.75] border-white/40 text-[#a67c2e]'
        }`}
      >
        <Bug className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline text-[13px] font-semibold whitespace-nowrap">Report a bug</span>
      </button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Report a bug" icon={<Bug className="w-4 h-4 md:w-5 md:h-5" />} width="md">
        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className={`text-[16px] font-semibold ${isDark ? 'text-[#f5efe5]' : 'text-[#2d2820]'}`}>Thanks for the report!</p>
            <p className={`text-[14px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>Our team will take a look.</p>
            <ModalButton variant="primary" onClick={handleClose} className="mt-2">
              Done
            </ModalButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <ModalInput
              label="What went wrong?"
              value={description}
              onChange={setDescription}
              placeholder="Describe the bug or error you ran into..."
              rows={4}
              required
              autoFocus
            />

            <div className="mt-4">
              <label className={`block text-[13px] font-medium mb-2 ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>
                Screenshot <span className="opacity-60 font-normal">(optional)</span>
              </label>
              {screenshot ? (
                <div
                  className={`flex items-center gap-3 p-3 rounded-[14px] border ${
                    isDark ? 'bg-white/[0.08] border-white/15' : 'bg-white/[0.15] border-white/25'
                  }`}
                >
                  <img src={screenshot} alt="Screenshot preview" className="w-12 h-12 rounded-[8px] object-cover shrink-0" />
                  <span className={`flex-1 text-[13px] truncate ${isDark ? 'text-[#d4d4d4]' : 'text-[#7a6b5a]'}`}>{screenshotName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotName(null);
                    }}
                    className={`shrink-0 p-1 rounded-full transition-colors ${isDark ? 'text-[#b8a898] hover:text-white hover:bg-white/10' : 'text-[#7a6b5a] hover:text-black hover:bg-black/5'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  className={`flex items-center justify-center gap-2 p-4 rounded-[14px] border border-dashed cursor-pointer text-[13px] font-medium transition-colors ${
                    isDark
                      ? 'border-[#c9983a]/50 bg-white/[0.04] hover:bg-white/[0.08] text-[#d4c5b0]'
                      : 'border-[#c9983a]/50 bg-white/40 hover:bg-white/60 text-[#7a6b5a]'
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
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit report'}
              </ModalButton>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </>
  );
}
