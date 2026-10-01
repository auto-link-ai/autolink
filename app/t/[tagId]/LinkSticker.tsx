import { getTranslations } from 'next-intl/server';
import { linkStickerAction } from '@/app/[locale]/(site)/activate/actions';
import { StickerIcon } from '@/components/site/icons';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import { linkPath } from '@/lib/activation/claimLink';

/**
 * A sticker nobody has linked yet. Its buyer scans it out of the packaging:
 * signed in, one tap links it; otherwise creating an account (or signing in)
 * links it on the way. Anyone else learns only that it cannot take messages
 * yet. Plain links and a plain form: no JavaScript on the scan page.
 */
export async function LinkSticker({
  publicTagId,
  locale,
  signedIn,
}: {
  publicTagId: string;
  locale: Locale;
  signedIn: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'scanner.link' });
  const next = encodeURIComponent(linkPath(locale, publicTagId));

  return (
    <section className="rounded-xl bg-white p-6 shadow-card-sm">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <StickerIcon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-h2 text-text">{t('title')}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{t('body')}</p>

      {signedIn ? (
        <form action={linkStickerAction} className="mt-6">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="tagId" value={publicTagId} />
          <button type="submit" className={buttonClasses('primary', 'md', 'w-full')}>
            {t('confirm')}
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <a href={`/${locale}/register?next=${next}`} className={buttonClasses('primary', 'md', 'w-full')}>
            {t('create')}
          </a>
          <a href={`/${locale}/login?next=${next}`} className={buttonClasses('secondary', 'md', 'w-full')}>
            {t('signIn')}
          </a>
        </div>
      )}

      <p className="mt-6 border-t border-border pt-4 text-sm leading-relaxed text-text-muted">{t('notYours')}</p>
    </section>
  );
}
