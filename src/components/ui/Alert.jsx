import clsx from 'clsx';

const VARIANT_CLASSES = {
  error: 'bg-error-bg text-error-text',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  info: 'bg-blue-bg text-blue-text',
  alerta: 'bg-alerta-bg text-alerta-text',
};

export function Alert({ variant = 'error', className, children, ...props }) {
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-lg px-3 py-2 text-sm',
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.error,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
