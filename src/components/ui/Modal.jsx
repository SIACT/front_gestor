import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Card } from './Card';

export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-sans text-lg font-semibold text-text-primary">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-background hover:text-text-primary"
                >
                  <X className="size-4" />
                </button>
              </div>
              {children}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
