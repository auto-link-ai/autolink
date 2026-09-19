import { getTranslations } from 'next-intl/server';
import { BellIcon, ChatIcon, LockIcon, QrIcon, ShieldIcon } from '../icons';

const COLUMNS = [
  { key: 'scan', Icon: QrIcon },
  { key: 'reason', Icon: ChatIcon },
  { key: 'notify', Icon: BellIcon },
] as const;

/** The privacy promise, on a dark card: the owner's number is never shown. */
export async function PrivacyBand() {
  const t = await getTranslations('site.privacy');

  return (
    <section aria-labelledby="privacy-title" className="py-14 md:py-20">
      <div className="container-page">
        <div className="rounded-xl bg-surface-inverse px-6 py-10 text-text-on-inverse md:px-12 md:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow text-accent">
                <ShieldIcon className="h-4 w-4" />
                {t('eyebrow')}
              </p>
              <h2 id="privacy-title" className="mt-4 text-h1">
                {t('title')}
              </h2>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-text-secondary-on-inverse md:text-lg">
                {t('subtitle')}
              </p>
            </div>

            {/* Masked number card */}
            <div aria-hidden="true" className="rounded-lg border border-white/10 bg-white/5 p-6">
              <p className="text-end text-[13px] text-text-secondary-on-inverse">{t('card.label')}</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-accent">
                  <LockIcon className="h-5 w-5" />
                </span>
                <span dir="ltr" className="font-mono text-2xl tracking-[0.2em] text-text-on-inverse md:text-3xl">
                  05 ••• ••• •••
                </span>
              </div>
              <p className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-[13px] text-text-secondary-on-inverse">
                <ShieldIcon className="h-4 w-4 text-accent" />
                {t('card.note')}
              </p>
            </div>
          </div>

          <ul className="mt-12 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-3 md:gap-0">
            {COLUMNS.map(({ key, Icon }, index) => (
              <li key={key} className={index > 0 ? 'md:border-s md:border-white/10 md:ps-8' : 'md:pe-8'}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-h3">{t(`columns.${key}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-text-secondary-on-inverse">
                  {t(`columns.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
