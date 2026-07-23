import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export const Select = forwardRef(function Select(
  { label, error, className, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        className={clsx(
          'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-text-primary',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50',
          error ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-accent',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-error-text">{error}</p>}
    </div>
  );
});
