import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';

const VARIANT_CLASSES = {
  default: 'bg-surface text-text-muted border border-border',
  pendiente: 'bg-warning-bg text-warning-text border border-warning-text/30',
  alerta: 'bg-alerta-bg text-alerta-text border border-alerta-text/30',
  revisado: 'bg-success-bg text-success-text border border-success-text/30',
  rechazado: 'bg-error-bg text-error-text border border-error-text/30',
  admin: 'bg-purple-bg text-purple-text border border-purple-text/30',
  ponente: 'bg-blue-bg text-blue-text border border-blue-text/30',
  estudiante: 'bg-success-bg text-success-text border border-success-text/30',
  // Paleta categórica para etiquetas de área temática (ver getAreaBadgeVariant en
  // utils/areaColor.js) — deliberadamente separada de los tonos semánticos de arriba.
  'area-blue': 'bg-blue-bg text-blue-text border border-blue-text/30',
  'area-purple': 'bg-purple-bg text-purple-text border border-purple-text/30',
  'area-teal': 'bg-area-teal-bg text-area-teal-text border border-area-teal-text/30',
  'area-pink': 'bg-area-pink-bg text-area-pink-text border border-area-pink-text/30',
  'area-cyan': 'bg-area-cyan-bg text-area-cyan-text border border-area-cyan-text/30',
  'area-indigo': 'bg-area-indigo-bg text-area-indigo-text border border-area-indigo-text/30',
};

export function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default,
        className,
      )}
      {...props}
    >
      {variant === 'alerta' && <AlertTriangle className="size-3" />}
      {children}
    </span>
  );
}
