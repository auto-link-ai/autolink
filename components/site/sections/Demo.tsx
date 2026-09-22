import { getLocale, getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/Wordmark';
import { IPhoneMockup } from '@/components/ui/IPhoneMockup';
import { locales } from '@/i18n/locales';
import { cx } from '@/lib/cx';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';
import { siteOrigin } from '@/lib/site/seo';
import { CheckIcon, LockIcon } from '../icons';

/** The iOS status bar's right-hand side: signal, Wi-Fi, battery. */
function StatusIcons() {
  return (
    <span className="flex items-center gap-1.5 text-text">
      <svg viewBox="0 0 18 12" className="h-3 w-4.5" fill="currentColor" aria-hidden="true">
        <rect x="0" y="8" width="3" height="4" rx="1" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
        <rect x="10" y="3" width="3" height="9" rx="1" />
        <rect x="15" y="0" width="3" height="12" rx="1" />
      </svg>
      <svg viewBox="0 0 16 12" className="h-3 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M1 4.2a10 10 0 0 1 14 0M3.7 7a6.2 6.2 0 0 1 8.6 0" strokeLinecap="round" />
        <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
      </svg>
      <svg viewBox="0 0 26 12" className="h-3 w-6.5" fill="none" aria-hidden="true">
        <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" stroke="currentColor" strokeOpacity="0.45" />
        <rect x="2.2" y="2.2" width="17" height="7.6" rx="2" fill="currentColor" />
        <path d="M23.5 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="currentColor" fillOpacity="0.45" />
      </svg>
    </span>
  );
}

/**
 * Product demonstration: the page a passer-by actually gets after scanning,
 * inside a phone. The screen is a still copy of /t/[tagId] — same words, same
 * order, same language — so the two never drift apart. Decorative
 * (aria-hidden): the text beside it carries the meaning.
 */
export async function Demo() {
  const [t, scanner, categories, locale] = await Promise.all([
    getTranslations('site.demo'),
    getTranslations('scanner'),
    getTranslations('scanner.categories'),
    getLocale(),
  ]);
  const host = siteOrigin().host.replace(/^www\./, '');

  return (
    <section aria-labelledby="demo-title" className="bg-surface-2 py-14 md:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Shown at about three quarters of a real phone, so it fits beside the text. */}
        <div aria-hidden="true" className="mx-auto [zoom:0.7] md:[zoom:0.78]">
          <IPhoneMockup
            model="15-pro"
            color="space-black"
            screenBg="var(--page-bg)"
            safeArea={false}
            homeIndicatorColor="rgba(29,23,20,0.55)"
          >
            <div className="flex h-full flex-col">
              <div dir="ltr" className="flex h-[54px] shrink-0 items-center justify-between px-8 pt-2 text-[15px] font-bold text-text">
                <span>9:41</span>
                <StatusIcons />
              </div>

              {/* Safari, on the address the printed QR code carries */}
              <div className="mx-4 flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/85 text-[13px] text-text-secondary shadow-card-sm">
                <LockIcon className="h-3.5 w-3.5" />
                <span dir="ltr">{host}</span>
              </div>

              <div className="flex flex-col gap-4 overflow-hidden px-5 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <Wordmark decorative className="h-8" />
                  <span className="flex items-center gap-1">
                    {locales.map((code) => (
                      <span
                        key={code}
                        className={cx(
                          'rounded-full px-2.5 py-1 text-xs font-bold uppercase',
                          code === locale ? 'bg-accent text-accent-ink' : 'text-text-secondary',
                        )}
                      >
                        {code}
                      </span>
                    ))}
                  </span>
                </div>

                <div>
                  {/* A fixed phone size: the site's own heading scale grows on desktop screens. */}
                  <p className="text-[28px] leading-[1.15] font-bold tracking-tight text-text">{scanner('title')}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{scanner('subtitle')}</p>
                  <p className="mt-3 inline-flex rounded-full bg-surface-3 px-4 py-1.5 text-[15px] font-bold text-text">
                    {t('screen.vehicle')}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-card-sm">
                  <p className="text-sm font-bold text-text">{scanner('form.category')}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {MESSAGE_CATEGORIES.map((category, index) => (
                      <span
                        key={category}
                        className={cx(
                          'flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-[15px]',
                          index === 0 ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-border bg-white text-text',
                        )}
                      >
                        <span
                          className={cx(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                            index === 0 ? 'border-accent bg-accent text-white' : 'border-border-strong',
                          )}
                        >
                          {index === 0 && <CheckIcon className="h-2.5 w-2.5" />}
                        </span>
                        {categories(category)}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 text-sm font-bold text-text">{scanner('form.body')}</p>
                  <p className="mt-1.5 rounded-2xl border border-border p-3 text-[15px] leading-snug text-text-muted">
                    {scanner('form.bodyPlaceholder')}
                  </p>

                  <p className="mt-4 flex h-14 items-center justify-center rounded-full bg-accent text-[17px] font-bold text-accent-ink">
                    {scanner('form.submit')}
                  </p>
                </div>
              </div>
            </div>
          </IPhoneMockup>
        </div>

        <div>
          <h2 id="demo-title" className="text-h1 text-text">
            {t('title')}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-text-secondary md:text-lg">{t('subtitle')}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {(['scan', 'pick', 'notify'] as const).map((key) => (
              <li key={key} className="flex gap-3 text-[15px] text-text">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                {t(`points.${key}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
