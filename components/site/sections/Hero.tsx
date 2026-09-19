import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';
import { CarIllustration } from '../illustrations/CarIllustration';
import { NotificationCard } from '../illustrations/NotificationCard';
import { ArrowIcon, BellIcon, BoltIcon, LockIcon, ScanIcon, ShieldIcon } from '../icons';
import { href } from '../links';

const TRUST = [
  { key: 'secure', Icon: ShieldIcon },
  { key: 'private', Icon: LockIcon },
  { key: 'noApp', Icon: BoltIcon },
] as const;

export async function Hero({ locale, pricing }: { locale: Locale; pricing: PublicPricing | null }) {
  const t = await getTranslations('site.hero');

  return (
    <section className="pb-10 pt-8 md:pb-20 md:pt-14">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* Visual: card with the sticker art and two floating chips */}
        <figure className="relative order-2 mx-auto w-full max-w-140 lg:order-1">
          <div className="overflow-hidden rounded-xl shadow-card-lg">
            <CarIllustration className="w-full" />
          </div>
          <NotificationCard
            className="absolute -top-5 start-2 w-[min(17rem,88%)] md:-start-6"
            icon={<ScanIcon className="h-5 w-5" />}
            title={t('chips.scan.title')}
            body={t('chips.scan.body')}
          />
          <NotificationCard
            className="absolute -bottom-6 end-2 w-[min(17rem,88%)] md:-end-6"
            icon={<BellIcon className="h-5 w-5" />}
            title={t('chips.notify.title')}
            body={t('chips.notify.body')}
          />
          <figcaption className="sr-only">{t('illustrationLabel')}</figcaption>
        </figure>

        {/* Headline stack */}
        <div className="order-1 lg:order-2">
          <ul className="mb-6 flex items-center gap-2">
            {TRUST.map(({ key, Icon }) => (
              <li
                key={key}
                title={t(`trust.${key}`)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent shadow-card-sm"
              >
                <Icon className="h-4.5 w-4.5" />
                <span className="sr-only">{t(`trust.${key}`)}</span>
              </li>
            ))}
          </ul>

          <h1 className="max-w-[16ch] text-display text-text">{t('title')}</h1>
          <p className="mt-3 text-[17px] text-text-secondary md:text-xl">{t('subtitle')}</p>

          <p className="mt-8 max-w-[16ch] text-display text-accent">{t('titleAccent')}</p>
          <p className="mt-3 text-[17px] text-text-secondary md:text-xl">{t('subtitleAccent')}</p>

          <hr className="my-8 border-border" />

          <p className="max-w-[54ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('body')}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href={href(locale, '/order')} className={buttonClasses('primary')}>
              {t('cta')}
              <ArrowIcon />
            </Link>
            <Link
              href={href(locale, '/how-it-works')}
              className="inline-flex min-h-11 items-center gap-2 text-[16px] font-bold text-text hover:text-accent"
            >
              {t('secondary')}
              <ArrowIcon className="h-4 w-4 -rotate-45" />
            </Link>
          </div>
          {pricing && <p className="mt-4 text-sm font-semibold text-text-muted">{t('price', { price: pricing.unitPriceLabel })}</p>}
        </div>
      </div>
    </section>
  );
}
