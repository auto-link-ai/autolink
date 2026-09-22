import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { PublicPricing } from '@/lib/site/pricing';
import { NotificationCard } from '../illustrations/NotificationCard';
import { ArrowDownIcon, ArrowIcon, BellIcon, BoltIcon, CashIcon, LockIcon, QrIcon, ScanIcon } from '../icons';
import { href } from '../links';

/** The hero photo's pre-generated widths (public/images/hero-scan-*.webp). */
const PHOTO_WIDTHS = [640, 960, 1280, 1536] as const;

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

        {/*
          A real scan: the sticker on a windscreen and the page it opens; the
          card adds the other half, the owner being told. Pre-sized WebP, so a
          phone downloads ~40 KB, and no JavaScript. A photo is never mirrored,
          so the card sits bottom-left in every language — clear of the phone.
        */}
        <figure className="relative mx-auto w-full max-w-150">
          <picture>
            <source
              type="image/webp"
              srcSet={PHOTO_WIDTHS.map((w) => `/images/hero-scan-${w}.webp ${w}w`).join(', ')}
              sizes="(min-width: 1024px) 560px, calc(100vw - 2rem)"
            />
            <img
              src="/images/hero-scan-1280.jpg"
              alt={t('illustrationLabel')}
              width={1536}
              height={1024}
              fetchPriority="high"
              decoding="async"
              className="aspect-3/2 w-full rounded-xl object-cover shadow-card-lg"
            />
          </picture>
          <NotificationCard
            className="absolute -bottom-6 left-3 w-[min(16rem,72%)] md:-left-6"
            icon={<BellIcon className="h-5 w-5" />}
            title={t('chips.notify.title')}
            body={t('chips.notify.body')}
          />
        </figure>
      </div>
    </section>
  );
}
