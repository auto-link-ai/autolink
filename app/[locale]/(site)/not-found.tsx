import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { href } from '@/components/site/links';
import { buttonClasses } from '@/components/ui/Button';
import { toLocale } from '@/i18n/locales';

/** Localized 404 inside the site shell (the locale comes from the request). */
export default async function SiteNotFound() {
  const locale = toLocale(await getLocale());
  const t = await getTranslations('notFound');
  const nav = await getTranslations('site.nav');

  return (
    <section className="container-page flex flex-col items-start gap-4 py-20 md:py-28">
      <p className="eyebrow">404</p>
      <h1 className="text-h1 text-text">{t('title')}</h1>
      <p className="max-w-[52ch] text-text-secondary">{t('body')}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href={href(locale, '')} className={buttonClasses('primary')}>
          {t('backHome')}
        </Link>
        <Link href={href(locale, '/faq')} className={buttonClasses('secondary')}>
          {nav('faq')}
        </Link>
      </div>
    </section>
  );
}
