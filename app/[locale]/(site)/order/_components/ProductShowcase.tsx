import { getTranslations } from 'next-intl/server';
import { CashIcon, CheckIcon, LockIcon, QrIcon, TruckIcon } from '@/components/site/icons';
import { cx } from '@/lib/cx';

const BADGES = [
  { key: 'cod', Icon: CashIcon },
  { key: 'delivery', Icon: TruckIcon },
  { key: 'private', Icon: LockIcon },
  { key: 'noSubscription', Icon: CheckIcon },
] as const;

/** The two step photos shown under the sticker on wider screens (public/images/step-*). */
const PHOTOS = ['stick', 'notify'] as const;

/**
 * What it is, what it does and what it costs — above the form, so the first
 * screen sells before it asks. Every promise here is one the site already
 * makes (FAQ, pricing); no invented reviews or counters.
 */
export async function ProductIntro({ priceLabel, freeDelivery }: { priceLabel: string; freeDelivery: boolean }) {
  const [t, badge] = await Promise.all([getTranslations('order.product'), getTranslations('order.badges')]);
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-accent shadow-card-sm">
        <QrIcon className="h-4 w-4" />
        {t('eyebrow')}
      </p>
      <h1 className="mt-4 max-w-[24ch] text-h1 text-text lg:text-[2.5rem]">{t('title')}</h1>
      <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('body')}</p>

      <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span dir="ltr" className="text-[2.5rem] leading-none font-extrabold text-accent">
          {priceLabel}
        </span>
        <span className="text-[15px] font-semibold text-text-secondary">{t('priceSuffix')}</span>
      </p>

      <ul className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
        {BADGES.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-[13px] leading-snug font-bold text-text shadow-card-sm sm:text-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Icon className="h-4.5 w-4.5" />
            </span>
            {key === 'delivery' && freeDelivery ? badge('deliveryFree') : badge(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The real sticker, rendered from the print design (public/images/sticker-*,
 * its QR opens the site, not a tag), and on wider screens two photos of it in
 * use. Corners rounded as cut: 7 mm on an 80 × 113 mm sticker.
 */
export async function ProductGallery({ className }: { className?: string }) {
  const [t, steps] = await Promise.all([getTranslations('order.product'), getTranslations('site.steps')]);
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <figure className="relative flex items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-accent-soft via-surface-2 to-white px-6 py-8 sm:py-10">
        <span aria-hidden="true" className="absolute -top-16 -inset-e-16 h-56 w-56 rounded-full bg-accent/10" />
        <picture className="relative">
          <source
            type="image/webp"
            srcSet="/images/sticker-480.webp 480w, /images/sticker-720.webp 720w, /images/sticker-960.webp 960w"
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 272px, 208px"
          />
          <img
            src="/images/sticker-480.png"
            alt={t('stickerAlt')}
            width={480}
            height={678}
            fetchPriority="high"
            className="w-52 -rotate-3 rounded-[8.75%/6.19%] shadow-card-lg sm:w-68 lg:w-80"
          />
        </picture>
        <figcaption className="absolute bottom-3 inset-s-3 rounded-full bg-white px-3 py-1 text-sm font-bold text-text shadow-card-sm">
          {t('size')}
        </figcaption>
      </figure>

      <div className="hidden grid-cols-2 gap-3 sm:grid">
        {PHOTOS.map((key) => (
          <figure key={key} className="overflow-hidden rounded-2xl bg-white shadow-card-sm">
            <picture className="block bg-surface-3">
              <source
                type="image/webp"
                srcSet={`/images/step-${key}-400.webp 400w, /images/step-${key}-800.webp 800w`}
                sizes="(min-width: 1024px) 240px, 45vw"
              />
              <img
                src={`/images/step-${key}-800.jpg`}
                alt={steps(`items.${key}.imageAlt`)}
                width={800}
                height={533}
                loading="lazy"
                decoding="async"
                className="aspect-3/2 w-full object-cover"
              />
            </picture>
            <figcaption className="px-3 py-2.5 text-sm font-bold text-text">{steps(`items.${key}.title`)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
