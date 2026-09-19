import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n/locales';
import { ArrowIcon, BellIcon, ScanIcon, StickerIcon } from '../icons';
import { href } from '../links';

const STEPS = [
  { key: 'stick', Icon: StickerIcon },
  { key: 'scan', Icon: ScanIcon },
  { key: 'notify', Icon: BellIcon },
] as const;

/** Three steps, from the sticker to the owner's phone. */
export async function HowItWorks({ locale, showMore = true }: { locale: Locale; showMore?: boolean }) {
  const t = await getTranslations('site.steps');

  return (
    <section aria-labelledby="steps-title" className="py-14 md:py-20">
      <div className="container-page">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h2 id="steps-title" className="mt-3 max-w-[20ch] text-h2 text-text">
          {t('title')}
        </h2>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ key, Icon }, index) => (
            <li key={key} className="rounded-lg bg-white p-7 shadow-card-sm">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-mono text-sm font-bold text-text-muted">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="mt-5 text-h3 text-text">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t(`items.${key}.body`)}</p>
            </li>
          ))}
        </ol>

        {showMore && (
          <Link
            href={href(locale, '/how-it-works')}
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-accent hover:underline"
          >
            {t('more')}
            <ArrowIcon />
          </Link>
        )}
      </div>
    </section>
  );
}
