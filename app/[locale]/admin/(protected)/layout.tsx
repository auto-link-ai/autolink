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

  return (
    <div className="min-h-dvh bg-surface-2">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="rounded-sm bg-surface-inverse px-2 py-0.5 text-xs font-semibold text-text-on-inverse">
              {t('badge')}
            </span>
          </div>
          <nav aria-label={t('nav.label')} className="hidden sm:block">
            <Link href={`/${locale}/admin/tags`} className="rounded-sm px-3 py-2 text-sm font-semibold text-text hover:bg-surface-2">
              {t('nav.tags')}
            </Link>
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
