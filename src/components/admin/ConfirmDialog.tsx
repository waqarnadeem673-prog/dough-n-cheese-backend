import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
          onClick={isLoading ? undefined : onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isDestructive
                  ? 'bg-error-500/10 text-error-500'
                  : 'bg-primary-500/10 text-primary-400'
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-ink-50">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                isDestructive
                  ? 'bg-error-600 text-white hover:bg-error-500 shadow-md shadow-error-600/20'
                  : 'bg-primary-500 text-ink-950 hover:bg-primary-400 shadow-md shadow-primary-500/20'
              }`}
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
