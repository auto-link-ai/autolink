import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';
import { CarIllustration } from '../illustrations/CarIllustration';
import { NotificationCard } from '../illustrations/NotificationCard';
import { ArrowDownIcon, ArrowIcon, BellIcon, BoltIcon, CashIcon, LockIcon, QrIcon, ScanIcon } from '../icons';
import { href } from '../links';

/** What it promises, in words — never icons alone. */
const TRUST = [
  { key: 'private', Icon: LockIcon },
  { key: 'fast', Icon: BoltIcon },
  { key: 'noApp', Icon: ScanIcon },
] as const;

/**
 * The first screen: what it is, the promise in one headline, the order button
 * and the price — all visible without scrolling on a laptop, and the order
 * button within a phone's first screen. Text first on the reading side; the
 * picture beside it, or below on a phone.
 */
export async function Hero({ locale, pricing }: { locale: Locale; pricing: PublicPricing | null }) {
  const t = await getTranslations('site.hero');

  return (
    <section className="pb-14 pt-6 md:pb-20 md:pt-10">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-accent shadow-card-sm">
            <QrIcon className="h-4 w-4" />
            {t('eyebrow')}
          </p>

          {/* One headline, two sentences: the promise, then the privacy that makes it safe. */}
          <h1 className="mt-5 max-w-[19ch] text-hero text-text">
            {t('title')} <span className="block text-accent">{t('titleAccent')}</span>
          </h1>

          <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('body')}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-7">
            <Link href={href(locale, '/order')} className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}>
              {t('cta')}
              <ArrowIcon />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center justify-center gap-2 text-[16px] font-bold text-text hover:text-accent sm:justify-start"
            >
              {t('secondary')}
              <ArrowDownIcon className="h-4 w-4" />
            </a>
          </div>

          {pricing && (
            <p className="mt-4 flex items-center gap-2 text-[15px] text-text-secondary">
              <CashIcon className="h-5 w-5 text-accent" />
              <span>
                {t.rich('price', {
                  price: pricing.unitPriceLabel,
                  // Isolated, so "1 500 DA" keeps its order inside Arabic text.
                  b: (chunks) => <bdi className="font-bold text-text">{chunks}</bdi>,
                })}
              </span>
            </p>
          )}

          <ul className="mt-6 flex flex-wrap gap-2">
            {TRUST.map(({ key, Icon }) => (
              <li
                key={key}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-text shadow-card-sm"
              >
                <Icon className="h-4 w-4 text-accent" />
                {t(`trust.${key}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* The sticker on a car, and the two moments it is for. */}
        <figure className="relative mx-auto w-full max-w-130">
          <div className="overflow-hidden rounded-xl shadow-card-lg">
            <CarIllustration className="w-full" />
          </div>
          <NotificationCard
            className="absolute -top-5 inset-s-2 w-[min(17rem,88%)] md:-inset-s-6"
            icon={<ScanIcon className="h-5 w-5" />}
            title={t('chips.scan.title')}
            body={t('chips.scan.body')}
          />
          <NotificationCard
            className="absolute -bottom-6 inset-e-2 w-[min(17rem,88%)] md:-inset-e-6"
            icon={<BellIcon className="h-5 w-5" />}
            title={t('chips.notify.title')}
            body={t('chips.notify.body')}
          />
          <figcaption className="sr-only">{t('illustrationLabel')}</figcaption>
        </figure>
      </div>
    </section>
  );
}
