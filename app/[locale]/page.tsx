import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { LanguageLinks } from '@/components/LanguageLinks';
import { Wordmark } from '@/components/Wordmark';

type Props = { params: Promise<{ locale: string }> };

/** Phase 0 placeholder: proves tokens, fonts, locales and RTL. Replaced in Phase 6. */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const common = await getTranslations('common');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
        <Wordmark />
        <LanguageLinks current={locale} label={common('languageSwitcherLabel')} />
      </header>

      <main className="container-page flex flex-1 flex-col justify-center py-14 md:py-24">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h1 className="mt-4 max-w-[18ch] text-display text-text">{t('title')}</h1>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-text-secondary md:text-lg">
          {t('subtitle')}
        </p>
        <p className="mt-8 font-semibold text-accent">{common('tagline')}</p>
      </main>
    </div>
  );
}
