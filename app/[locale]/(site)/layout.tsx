import type { ReactNode } from 'react';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { routing } from '@/i18n/routing';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

/** Shell for every public page: header, main landmark, footer. */
export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('site.nav');

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-surface-inverse px-4 py-2 text-text-on-inverse focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('skipToContent')}
      </a>
      <SiteHeader locale={locale} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
