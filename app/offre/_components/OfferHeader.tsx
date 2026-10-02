import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/locales';

/**
 * Between the first picture and the form: what it is and the live price
 * (from Admin → Settings, never the one drawn in the picture). Nothing else —
 * the picture already says the rest.
 */
export async function OfferHeader({ locale, priceLabel }: { locale: Locale; priceLabel: string }) {
  const t = await getTranslations({ locale, namespace: 'offer' });
  return (
    <header className="bg-surface px-4 pt-6 pb-4 text-center">
      <h1 className="text-h2 text-text">{t('title')}</h1>
      <p dir="ltr" className="mt-3 text-[2.75rem] leading-none font-extrabold text-accent">
        {priceLabel}
      </p>
    </header>
  );
}
