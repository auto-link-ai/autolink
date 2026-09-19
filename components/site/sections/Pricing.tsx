import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';
import { ArrowIcon, CashIcon, CheckIcon, PhoneIcon, TruckIcon } from '../icons';
import { href } from '../links';

const INCLUDES = ['sticker', 'code', 'unlimited', 'notify', 'noSubscription'] as const;
const HOW = [
  { key: 'order', Icon: CheckIcon },
  { key: 'call', Icon: PhoneIcon },
  { key: 'deliver', Icon: TruckIcon },
  { key: 'pay', Icon: CashIcon },
] as const;

/** One product, one price (from settings), cash on delivery. */
export async function Pricing({
  locale,
  pricing,
  headingLevel = 'h2',
}: {
  locale: Locale;
  pricing: PublicPricing | null;
  headingLevel?: 'h2' | 'none';
}) {
  const t = await getTranslations('site.pricing');
  const price = await getTranslations('site.price');

  return (
    <section aria-labelledby={headingLevel === 'h2' ? 'pricing-title' : undefined} className="py-14 md:py-20">
      <div className="container-page">
        {headingLevel === 'h2' && (
          <>
            <p className="eyebrow">{t('eyebrow')}</p>
            <h2 id="pricing-title" className="mt-3 text-h2 text-text">
              {t('title')}
            </h2>
            <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>
          </>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-7 shadow-card-md md:p-10">
            <p className="text-sm font-bold text-text-muted">{t('product')}</p>
            {pricing ? (
              <p className="mt-3 text-display text-accent">
                <span dir="ltr">{pricing.unitPriceLabel}</span>
              </p>
            ) : (
              <p className="mt-3 text-h2 text-text">{price('unknown')}</p>
            )}
            <p className="mt-1 text-sm text-text-muted">{t('oneTime')}</p>

            <ul className="mt-7 flex flex-col gap-3">
              {INCLUDES.map((key) => (
                <li key={key} className="flex gap-3 text-[15px] text-text">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  {t(`includes.${key}`)}
                </li>
              ))}
            </ul>

            <p className="mt-7 border-t border-border pt-5 text-sm leading-relaxed text-text-secondary">{t('delivery')}</p>
            <Link href={href(locale, '/order')} className={buttonClasses('primary', 'md', 'mt-6 w-full sm:w-auto')}>
              {t('cta')}
              <ArrowIcon />
            </Link>
          </div>

          <div className="rounded-xl bg-surface-3 p-7 md:p-10">
            <h3 className="text-h3 text-text">{t('howTitle')}</h3>
            <ol className="mt-6 flex flex-col gap-6">
              {HOW.map(({ key, Icon }, index) => (
                <li key={key} className="flex gap-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-accent shadow-card-sm">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -inset-e-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent font-mono text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                  </span>
                  <div>
                    <p className="font-bold text-text">{t(`how.${key}.title`)}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{t(`how.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
