import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { StickerIcon } from '@/components/site/icons';
import { PageHero } from '@/components/site/sections/SectionHeading';
import { buttonClasses } from '@/components/ui/Button';
import { routing } from '@/i18n/routing';
import { linkPath } from '@/lib/activation/claimLink';
import { requireOwner } from '@/lib/auth/session';
import { normalizeTagIdInput } from '@/lib/validation/tagId';
import { linkStickerAction } from './actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ERRORS = ['invalid', 'rate_limited', 'server_error'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'activate' });
  return { title: t('metaTitle'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/**
 * Linking a sticker to the signed-in account. Reached from the scan page, or
 * after signing in on the way there: one tap. Someone whose camera will not
 * scan can type the id printed under the QR instead. Old slip links
 * (`?t=…&c=…`) still land here; the code is simply not needed any more.
 */
export default async function ActivatePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const raw = await searchParams;
  const publicTagId = normalizeTagIdInput(first(raw.t));
  await requireOwner(locale, publicTagId ? linkPath(locale, publicTagId) : `/${locale}/activate`);

  const t = await getTranslations('activate');
  const error = ERRORS.find((code) => code === first(raw.error)) ?? null;

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />
      <section className="pb-16 md:pb-24">
        <div className="container-page max-w-160">
          <form action={linkStickerAction} className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card-sm md:p-8">
            <input type="hidden" name="locale" value={locale} />
            {error && (
              <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger">
                {t(`errors.${error}`)}
              </p>
            )}
            {publicTagId ? (
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <StickerIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-[17px] font-bold text-text">{t('ready')}</p>
                  <p dir="ltr" className="font-mono text-[15px] font-bold text-accent rtl:text-end">
                    {publicTagId}
                  </p>
                </div>
                <input type="hidden" name="tagId" value={publicTagId} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="act-tag" className="text-sm font-bold text-text">
                  {t('fields.tagId')}
                </label>
                <input
                  id="act-tag"
                  name="tagId"
                  required
                  dir="ltr"
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder="AUT-"
                  className="h-13 w-full rounded-2xl border border-border-strong bg-white px-4 font-mono text-[16px] text-text outline-none focus:border-accent rtl:text-end"
                />
                <span className="text-sm text-text-muted">{t('fields.tagIdHint')}</span>
              </div>
            )}
            <button type="submit" className={buttonClasses('primary', 'md', 'w-full')}>
              {t('submit')}
            </button>
          </form>
          <p className="mt-6 rounded-2xl bg-surface-3 px-5 py-4 text-[15px] leading-relaxed text-text-secondary">
            {t('help')}
          </p>
        </div>
      </section>
    </>
  );
}
