import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { cx } from '@/lib/cx';

/**
 * One number on the dashboard, and where to go to act on it. `urgent` is for a
 * figure that means work is waiting, not for a figure that is merely large.
 */
export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  urgent = false,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex flex-col rounded-md border bg-surface p-5 shadow-card-sm transition-colors hover:bg-surface-2',
        urgent ? 'border-accent' : 'border-border',
      )}
    >
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Icon className={cx('h-4 w-4', urgent && 'text-accent')} />
        {label}
      </span>
      <span className={cx('mt-2 text-h2 tabular-nums', urgent ? 'text-accent' : 'text-text')}>{value}</span>
      <span className="mt-1 text-sm text-text-secondary">{hint}</span>
    </Link>
  );
}
