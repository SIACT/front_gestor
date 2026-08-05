import { forwardRef, useId } from 'react';
import clsx from 'clsx';

export const Textarea = forwardRef(function Textarea(
  { label, error, className, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={clsx(
          'w-full rounded-lg border bg-surface px-3 py-1.5 text-sm text-text-primary',
          'placeholder:text-text-placeholder',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50',
          error ? ' border-error-text focus:ring-error-text/50' : 'border-border focus:border-accent' ,
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-error-text">{error}</p>}
    </div>
  );
});
