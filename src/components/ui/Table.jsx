import clsx from 'clsx';

export function Table({ className, children, ...props }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className={clsx('w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

Table.Head = function TableHead({ className, children, ...props }) {
  return (
    <thead className={clsx('border-b border-border', className)} {...props}>
      {children}
    </thead>
  );
};

Table.HeadCell = function TableHeadCell({ className, children, ...props }) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
};

Table.Row = function TableRow({ className, children, ...props }) {
  return (
    <tr className={clsx('border-b border-border transition-colors last:border-0 hover:bg-white/5', className)} {...props}>
      {children}
    </tr>
  );
};

Table.Cell = function TableCell({ className, children, ...props }) {
  return (
    <td className={clsx('px-4 py-3 text-text-primary', className)} {...props}>
      {children}
    </td>
  );
};
