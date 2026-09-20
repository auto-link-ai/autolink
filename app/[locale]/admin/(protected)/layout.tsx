import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminNav } from '@/components/admin/AdminNav';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { requireAdmin } from '@/lib/admin/auth';
import { adminOrdersRepository } from '@/lib/db/repositories/ordersAdmin';
import { adminLogoutAction } from './actions';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const t = await getTranslations('admin');
  // A badge on the nav so a new order is never missed.
  let pending = 0;
  try {
    pending = (await adminOrdersRepository.countByStatus(session.actor)).PENDING;
  } catch (error) {
    console.error('[admin] pending count failed:', error instanceof Error ? error.message : error);
  }

  const labels = {
    overview: t('nav.overview'),
    orders: t('nav.orders'),
    tags: t('nav.tags'),
    customers: t('nav.customers'),
    settings: t('nav.settings'),
  };

  const badge = (
    <span className="rounded-sm bg-surface-inverse px-2 py-0.5 text-xs font-semibold text-text-on-inverse">
      {t('badge')}
    </span>
  );

  const signOut = (
    <form action={adminLogoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="ghost" size="sm">
        {t('nav.logout')}
      </Button>
    </form>
  );

  return (
    <div className="min-h-dvh bg-surface-2 lg:flex">
      {/* Sidebar: the console shape, from lg up. `border-e` so Arabic mirrors it. */}
      <div className="hidden w-64 shrink-0 border-e border-border bg-surface lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <Link href={`/${locale}/admin`} className="rounded-sm" aria-label={t('nav.overview')}>
            <Wordmark className="h-9" decorative />
          </Link>
          {badge}
        </div>
        <nav aria-label={t('nav.label')} className="px-3">
          <AdminNav locale={locale} pending={pending} labels={labels} layout="sidebar" />
        </nav>
        <div className="mt-auto border-t border-border px-5 py-4">
          <p className="mb-2 truncate text-sm text-text-muted" dir="ltr" title={session.email}>
            {session.email}
          </p>
          {signOut}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Small screens keep a bar: a drawer would be one more thing to maintain. */}
        <header className="border-b border-border bg-surface lg:hidden">
          <div className="container-page flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wordmark className="h-9" />
              {badge}
            </div>
            {signOut}
          </div>
          <nav aria-label={t('nav.label')} className="container-page pb-2">
            <AdminNav locale={locale} pending={pending} labels={labels} layout="bar" />
          </nav>
        </header>

        <main className="container-page py-8 md:py-10 lg:max-w-none lg:px-8">{children}</main>
      </div>
    </div>
  );
}
