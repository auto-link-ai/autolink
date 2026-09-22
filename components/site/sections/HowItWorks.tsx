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

/** Three steps, from the sticker to the owner's phone — each with its photo. */
export async function HowItWorks({ locale, showMore = true }: { locale: Locale; showMore?: boolean }) {
  const t = await getTranslations('site.steps');

  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-24 py-14 md:py-20">
      <div className="container-page">
        <p className="eyebrow">{t('eyebrow')}</p>
        <h2 id="steps-title" className="mt-3 max-w-[20ch] text-h2 text-text">
          {t('title')}
        </h2>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ key, Icon }, index) => (
            <li key={key} className="flex flex-col rounded-lg bg-white p-5 shadow-card-sm md:p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-mono text-sm font-bold text-accent">{String(index + 1).padStart(2, '0')}</span>
              </div>
              {/* Pre-sized WebP (8–40 KB), loaded only as the steps come into view. */}
              <picture className="mt-4 block overflow-hidden rounded-2xl bg-surface-3">
                <source
                  type="image/webp"
                  srcSet={`/images/step-${key}-400.webp 400w, /images/step-${key}-800.webp 800w`}
                  sizes="(min-width: 768px) 360px, calc(100vw - 4.5rem)"
                />
                <img
                  src={`/images/step-${key}-800.jpg`}
                  alt={t(`items.${key}.imageAlt`)}
                  width={800}
                  height={533}
                  loading="lazy"
                  decoding="async"
                  className="aspect-3/2 w-full object-cover"
                />
              </picture>
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
