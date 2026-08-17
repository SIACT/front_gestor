import { forwardRef, useId, useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

export const Input = forwardRef(function Input(
  { label, icon, error, className, id, type, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wide text-text-muted"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-text-placeholder">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={Boolean(error)}
          className={clsx(
            'w-full rounded-lg border bg-surface px-3 py-1.5 text-sm text-text-primary',
            'placeholder:text-text-placeholder',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50',
            icon && 'pl-10',
            isPassword && 'pr-10',
            error ? 'border-error-text focus:ring-error-text/50': ' focus:border-accent',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 flex items-center text-text-placeholder transition-colors hover:text-text-primary"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-error-text">{error}</p>}
    </div>
  );
});
