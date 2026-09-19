import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';
import { ArrowIcon, ChevronIcon } from '../icons';
import { href } from '../links';

export const FAQ_KEYS = [
  'app',
  'number',
  'price',
  'receive',
  'pay',
  'activate',
  'abuse',
  'change',
  'emergency',
  'retention',
] as const;
export type FaqKey = (typeof FAQ_KEYS)[number];

export const HOME_FAQ: readonly FaqKey[] = ['app', 'number', 'price', 'pay', 'emergency'];

/** Native <details> rows, styled as white pills. No JavaScript. */
export async function Faq({
  locale,
  pricing,
  keys = FAQ_KEYS,
  withHeading = true,
  showAllLink = false,
}: {
  locale: Locale;
  pricing: PublicPricing | null;
  keys?: readonly FaqKey[];
  withHeading?: boolean;
  showAllLink?: boolean;
}) {
  const t = await getTranslations('site.faq');
  const price = await getTranslations('site.price');
  const values = {
    price: pricing?.unitPriceLabel ?? price('unknownInline'),
    period: pricing ? price('retentionDays', { days: pricing.retentionDays }) : price('retentionUnknown'),
  };

  return (
    <section aria-labelledby={withHeading ? 'faq-title' : undefined} className="py-14 md:py-20">
      <div className="container-page max-w-225">
        {withHeading && (
          <>
            <p className="eyebrow">{t('eyebrow')}</p>
            <h2 id="faq-title" className="mt-3 text-h2 text-text">
              {t('title')}
            </h2>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {keys.map((key) => (
            <details key={key} className="group rounded-3xl bg-white px-5 shadow-card-sm md:px-6">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-bold text-text [&::-webkit-details-marker]:hidden md:text-[17px]">
                {t(`items.${key}.q`)}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent transition-transform group-open:rotate-180">
                  <ChevronIcon className="h-4 w-4" />
                </span>
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-text-secondary">{t(`items.${key}.a`, values)}</p>
            </details>
          ))}
        </div>

        {showAllLink && (
          <Link
            href={href(locale, '/faq')}
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-accent hover:underline"
          >
            {t('all')}
            <ArrowIcon />
          </Link>
        )}
      </div>
    </section>
  );
}
