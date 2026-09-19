import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-md border border-border bg-surface p-5 shadow-card-sm md:p-6', className)}>
      {(title || actions) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-h3 text-text">{title}</h2>}
            {description && <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}
