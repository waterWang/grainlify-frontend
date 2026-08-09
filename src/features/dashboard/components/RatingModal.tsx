import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { Modal, ModalInput } from '../../../shared/components/ui/Modal';
import { Spotlight } from '../../../shared/components/ui/Spotlight';
import { submitOrgRating } from '../../../shared/api/client';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgLogin: string;
  /** Pre-fills the picker/comment when the caller already has a rating for
   * this org, turning the modal into an edit flow rather than a fresh one. */
  initialRating?: number | null;
  initialComment?: string | null;
  onSubmitted: (rating: number, comment: string) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Not great',
  2: 'Could be better',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent!',
};

export function RatingModal({ isOpen, onClose, orgLogin, initialRating, initialComment, onSubmitted }: RatingModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [rating, setRating] = useState(initialRating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialComment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<{ rating: number; comment: string } | null>(null);

  const displayRating = hoverRating || rating;

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setJustSubmitted(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Pick a star rating before submitting.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const trimmedComment = comment.trim();
      await submitOrgRating(orgLogin, { rating, comment: trimmedComment || undefined });
      // Notify the parent (to refresh the org summary/reviews list) the
      // moment the submission actually succeeds, not when the success
      // screen is dismissed - the user might dismiss it via backdrop click
      // instead of the "Done" button, and the parent must still learn the
      // rating went through either way.
      setJustSubmitted({ rating, comment: trimmedComment });
      onSubmitted(rating, trimmedComment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit your rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setJustSubmitted(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={justSubmitted ? undefined : initialRating ? 'Edit your review' : 'Rate this organization'}
      icon={justSubmitted ? undefined : <Star className="w-6 h-6 text-[#c9983a]" />}
      width="md"
      showCloseButton={!justSubmitted}
      footer={
        justSubmitted ? undefined : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 mt-4 md:mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`px-4 md:px-5 py-2.5 rounded-[10px] md:rounded-[12px] backdrop-blur-[20px] border font-medium text-[13px] md:text-[14px] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-white/[0.08] border-white/15 text-[#d4d4d4] hover:bg-white/[0.12]' : 'bg-white/[0.15] border-white/25 text-[#7a6b5a] hover:bg-white/[0.2]'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating < 1 || isSubmitting}
              className={`px-4 md:px-5 py-2.5 rounded-[10px] md:rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[13px] md:text-[14px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all hover:scale-[1.02] flex items-center justify-center gap-2 w-full sm:w-auto ${
                rating < 1 || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Submitting…' : initialRating ? 'Update review' : 'Submit review'}
            </button>
          </div>
        )
      }
    >
      <AnimatePresence mode="wait">
        {justSubmitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative py-6 text-center overflow-hidden"
          >
            <Spotlight />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#c9983a]/25 to-[#d4af37]/15 border border-[#c9983a]/40 mb-4"
            >
              <CheckCircle2 className="w-8 h-8 text-[#c9983a]" />
            </motion.div>
            <h3 className={`relative text-[18px] font-bold mb-1.5 ${isDark ? 'text-[#f5f5f5]' : 'text-[#2d2820]'}`}>
              Thanks for your review!
            </h3>
            <p className={`relative text-[13px] mb-6 ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              Your rating now shows publicly on {orgLogin}'s page.
            </p>
            <button
              type="button"
              onClick={handleDone}
              className="relative px-6 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-medium text-[13px] shadow-[0_6px_20px_rgba(162,121,44,0.35)] hover:shadow-[0_8px_24px_rgba(162,121,44,0.5)] transition-all hover:scale-[1.02]"
            >
              Done
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <p className={`text-[13px] ${isDark ? 'text-[#b8a898]' : 'text-[#7a6b5a]'}`}>
              You had a pull request merged into <strong>{orgLogin}</strong>. How was your experience contributing here?
            </p>

            <div className="relative py-4">
              <div className="flex items-center justify-center gap-2 sm:gap-3" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <motion.button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1"
                  >
                    <Star
                      className={`w-10 h-10 sm:w-11 sm:h-11 transition-colors duration-150 ${
                        value <= displayRating
                          ? 'text-[#c9983a] fill-[#c9983a] drop-shadow-[0_0_12px_rgba(201,152,58,0.6)]'
                          : isDark
                            ? 'text-white/20'
                            : 'text-black/15'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="h-5 mt-1 text-center">
                <AnimatePresence mode="wait">
                  {displayRating > 0 && (
                    <motion.span
                      key={displayRating}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-[13px] font-semibold text-[#c9983a] inline-block"
                    >
                      {RATING_LABELS[displayRating]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <ModalInput
              label="Comment (optional)"
              value={comment}
              onChange={setComment}
              placeholder="What was it like working with this org's maintainers?"
              rows={4}
            />

            {error && (
              <div className="text-[12px] font-semibold text-red-400">{error}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
