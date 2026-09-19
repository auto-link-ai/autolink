import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { ArrowIcon } from '../icons';
import { href } from '../links';

export async function CtaBand({ locale }: { locale: Locale }) {
  const t = await getTranslations('site.ctaBand');

  return (
    <section className="py-14 md:py-20">
      <div className="container-page">
        <div className="flex flex-col items-start gap-8 rounded-xl bg-accent px-6 py-12 text-accent-ink md:flex-row md:items-center md:justify-between md:px-14 md:py-14">
          <div className="max-w-[46ch]">
            <h2 className="text-h2">{t('title')}</h2>
            <p className="mt-3 text-[16px] leading-relaxed opacity-90 md:text-lg">{t('body')}</p>
          </div>
          <Link
            href={href(locale, '/order')}
            className={buttonClasses('primary', 'md', 'shrink-0 bg-white! text-accent! hover:bg-surface-2!')}
          >
            {t('button')}
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
