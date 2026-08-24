import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { evaluarRecordatorioArchivo, evaluarRecordatorioComprobante } from '../utils/recordatorios';

function leerMinimizado(storageKey) {
  try {
    return sessionStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function guardarMinimizado(storageKey, value) {
  try {
    sessionStorage.setItem(storageKey, String(value));
  } catch {
    // sessionStorage no disponible (modo privado, etc.) — se pierde la persistencia, no es crítico.
  }
}

function Burbuja({ storageKey, variant, mensaje, detalle }) {
  const [minimizado, setMinimizado] = useState(() => leerMinimizado(storageKey));
  const colorClasses = variant === 'error' ? 'text-error-text' : 'text-warning-text';

  function toggle() {
    setMinimizado((prev) => {
      const next = !prev;
      guardarMinimizado(storageKey, next);
      return next;
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {minimizado ? (
          <motion.button
            key="mini"
            type="button"
            onClick={toggle}
            aria-label="Expandir recordatorio"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-surface shadow-lg shadow-black/30 transition-colors hover:border-accent"
          >
            <AlertCircle className={clsx('size-5', colorClasses)} />
          </motion.button>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex max-w-xs items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-lg shadow-black/30"
          >
            <AlertCircle className={clsx('size-5 shrink-0', colorClasses)} />
            <div className="flex-1 text-sm text-text-primary">
              {mensaje}
              {detalle && <p className="mt-1 text-xs text-text-muted">{detalle}</p>}
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Minimizar"
              className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
            >
              <ChevronDown className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function BurbujasRecordatorio({ comprobante, archivos, estadoInscripcion, idInscripcion }) {
  if (estadoInscripcion !== 'pendiente') return null;

  const recordatorios = [
    { key: 'comprobante', ...evaluarRecordatorioComprobante(comprobante) },
    { key: 'archivo', ...evaluarRecordatorioArchivo(archivos) },
  ].filter((r) => r.activo);

  if (recordatorios.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3">
      {recordatorios.map((r) => (
        <Burbuja
          key={r.key}
          storageKey={`recordatorio-minimizado-${idInscripcion}-${r.key}`}
          variant={r.variant}
          mensaje={r.mensaje}
          detalle={r.detalle}
        />
      ))}
    </div>
  );
}
