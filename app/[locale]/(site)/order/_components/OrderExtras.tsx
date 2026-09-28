import { getTranslations } from 'next-intl/server';
import { ArrowIcon, BellIcon, BookIcon, LockIcon, StickerIcon, WhatsAppIcon } from '@/components/site/icons';
import { Faq, type FaqKey } from '@/components/site/sections/Faq';
import { HowItWorks } from '@/components/site/sections/HowItWorks';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';

const INCLUDES = [
  { key: 'sticker', Icon: StickerIcon },
  { key: 'slip', Icon: LockIcon },
  { key: 'messages', Icon: BellIcon },
  { key: 'carBook', Icon: BookIcon },
] as const;

/** The questions people ask before buying, from the site FAQ. */
const ORDER_FAQ: readonly FaqKey[] = ['number', 'app', 'pay', 'change', 'price'];

async function Includes() {
  const t = await getTranslations('order.includes');
  return (
    <section aria-labelledby="includes-title" className="py-14 md:py-20">
      <div className="container-page">
        <h2 id="includes-title" className="text-h2 text-text">
          {t('title')}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDES.map(({ key, Icon }) => (
            <li key={key} className="rounded-lg bg-white p-5 shadow-card-sm md:p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-h3 text-text">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t(`items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function LastCall({ whatsapp }: { whatsapp: { href: string; label: string } | null }) {
  const t = await getTranslations('order.cta');
  return (
    <section className="py-14 md:py-20">
      <div className="container-page">
        <div className="flex flex-col items-start gap-8 rounded-xl bg-accent px-6 py-12 text-accent-ink md:flex-row md:items-center md:justify-between md:px-14 md:py-14">
          <div className="max-w-[46ch]">
            <h2 className="text-h2">{t('title')}</h2>
            <p className="mt-3 text-[16px] leading-relaxed opacity-90 md:text-lg">{t('body')}</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
            <a href="#order-form" className={buttonClasses('primary', 'md', 'bg-white! text-accent! hover:bg-surface-2!')}>
              {t('button')}
              <ArrowIcon />
            </a>
            {whatsapp && (
              <a
                href={whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 text-[15px] font-bold text-accent-ink hover:underline"
              >
                <WhatsAppIcon className="h-5 w-5" />
                {whatsapp.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Below the form: what comes in the parcel, how it works, the usual questions, and one more way back to the form. */
export async function OrderExtras({
  locale,
  pricing,
  whatsapp,
}: {
  locale: Locale;
  pricing: PublicPricing | null;
  whatsapp: { href: string; label: string } | null;
}) {
  return (
    <>
      <Includes />
      <HowItWorks locale={locale} showMore={false} />
      <Faq locale={locale} pricing={pricing} keys={ORDER_FAQ} />
      <LastCall whatsapp={whatsapp} />
    </>
  );
}
