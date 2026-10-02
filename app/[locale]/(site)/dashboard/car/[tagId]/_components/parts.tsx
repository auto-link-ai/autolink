import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CheckIcon } from '@/components/site/icons';
import { PendingLink } from '@/components/ui/PendingLink';
import { cx } from '@/lib/cx';

/** One white card of the car book. With a title, it is a named region. */
export function BookCard({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  const Tag = title ? 'section' : 'div';
  return (
    <Tag aria-label={title} className={cx('rounded-xl bg-white p-5 shadow-card-sm md:p-6', className)}>
      {title && <h2 className="mb-3 text-h3 text-text">{title}</h2>}
      {children}
    </Tag>
  );
}

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Where the owner is, and the way back: a breadcrumb whose last step is the
 * current page, then the page's one heading. On a phone the path would wrap
 * over two lines, so it shows only the way back: « ‹ » and the step before.
 */
export async function BookHeader({
  crumbs,
  title,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  children?: ReactNode;
}) {
  const t = await getTranslations('care');
  const back = crumbs.findLast((crumb) => crumb.href);
  return (
    <header>
      <nav aria-label={t('breadcrumb')}>
        {back?.href && (
          <PendingLink
            href={back.href}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent underline-offset-4 hover:underline sm:hidden"
          >
            <span aria-hidden="true" className="inline-block text-lg leading-none rtl:rotate-180">
              ‹
            </span>
            {back.label}
          </PendingLink>
        )}
        <ol className="hidden flex-wrap items-center gap-x-1 gap-y-0.5 text-sm sm:flex">
          {crumbs.map((crumb, i) => (
            <li key={crumb.label} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden="true" className="inline-block px-1 text-text-muted rtl:rotate-180">
                  ›
                </span>
              )}
              {crumb.href ? (
                <PendingLink href={crumb.href} className="inline-flex min-h-11 items-center font-bold text-accent underline-offset-4 hover:underline">
                  {crumb.label}
                </PendingLink>
              ) : (
                <span aria-current="page" className="inline-flex min-h-11 items-center font-semibold text-text-secondary">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="mt-1 text-h2 text-text">{title}</h1>
      {children}
    </header>
  );
}

/** "Saved." after coming back from a form. Announced, not just shown. */
export function Banner({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 rounded-2xl bg-success/10 px-5 py-4 text-[16px] font-bold text-success">
      <CheckIcon className="h-5 w-5" />
      {children}
    </p>
  );
}
