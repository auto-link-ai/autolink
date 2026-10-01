import { getTranslations } from 'next-intl/server';
import { CashIcon, LockIcon, TruckIcon } from '@/components/site/icons';
import type { Locale } from '@/i18n/locales';

/**
 * Between the first picture and the form: what it is, the live price (from
 * Admin → Settings, never the one drawn in the picture) and the three promises
 * people look for on a cash-on-delivery page.
 */
export async function OfferHeader({
  locale,
  priceLabel,
  freeDelivery,
}: {
  locale: Locale;
  priceLabel: string;
  freeDelivery: boolean;
}) {
  const [t, badge] = await Promise.all([
    getTranslations({ locale, namespace: 'offer' }),
    getTranslations({ locale, namespace: 'order.badges' }),
  ]);
  const badges = [
    { Icon: CashIcon, text: badge('cod') },
    { Icon: TruckIcon, text: freeDelivery ? badge('deliveryFree') : badge('delivery') },
    { Icon: LockIcon, text: badge('private') },
  ];

  return (
    <header className="bg-surface px-4 pt-6 pb-4 text-center">
      <h1 className="text-h2 text-text">{t('title')}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t('subtitle')}</p>
      <p dir="ltr" className="mt-4 text-[2.75rem] leading-none font-extrabold text-accent">
        {priceLabel}
      </p>
      <ul className="mt-4 flex flex-wrap justify-center gap-2">
        {badges.map(({ Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-text shadow-card-sm"
          >
            <Icon className="h-4 w-4 text-accent" />
            {text}
          </li>
        ))}
      </ul>
    </header>
  );
}
