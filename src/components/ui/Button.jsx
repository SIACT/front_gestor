import { forwardRef } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

const VARIANT_CLASSES = {
  primary: 'bg-accent text-background hover:bg-accent-hover disabled:hover:bg-accent',
  secondary:
    'bg-transparent text-text-primary border border-border hover:border-accent disabled:hover:border-border',
  ghost: 'bg-transparent text-text-primary hover:bg-surface disabled:hover:bg-transparent',
  destructive: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
};

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-sans font-medium transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
});
