import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { Card } from './Card';

const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
};

export function Modal({ open, onClose, title, children, size = 'md', accentClassName }) {
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
            className={clsx('w-full', SIZE_CLASSES[size] ?? SIZE_CLASSES.md)}
          >
            <Card className="max-h-[90vh] overflow-y-auto">
              {accentClassName && (
                // Debe ser el primer elemento dentro de Card, antes del header (título/X) —
                // el -mx-6 -mt-6 solo cancela el p-6 de Card (ver Card.jsx) si no hay nada
                // por delante en el flujo; puesto después del header no llegaría al borde real.
                <div className={clsx('-mx-6 -mt-6 mb-4 h-1.5 rounded-t-xl', accentClassName)} />
              )}
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
