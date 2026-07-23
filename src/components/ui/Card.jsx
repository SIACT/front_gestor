import clsx from 'clsx';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-surface p-6 shadow-lg shadow-black/20',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
