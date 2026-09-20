import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  return (
    <div className="min-h-dvh bg-surface-2">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark className="h-10" />
            <span className="rounded-sm bg-surface-inverse px-2 py-0.5 text-xs font-semibold text-text-on-inverse">
              {t('badge')}
            </span>
          </div>
          <nav aria-label={t('nav.label')}>
            <ul className="flex items-center gap-1">
              {(['orders', 'tags', 'settings'] as const).map((key) => (
                <li key={key}>
                  <Link
                    href={`/${locale}/admin/${key}`}
                    className="inline-flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2"
                  >
                    {t(`nav.${key}`)}
                    {key === 'orders' && pending > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-ink">{pending}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-text-muted md:inline" dir="ltr">
              {session.email}
            </span>
            <form action={adminLogoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="ghost" size="sm">
                {t('nav.logout')}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container-page py-8 md:py-10">{children}</main>
    </div>
  );
}
