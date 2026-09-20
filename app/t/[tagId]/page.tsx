import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Wordmark } from '@/components/Wordmark';
import { locales } from '@/i18n/locales';
import { scannerTagsRepository } from '@/lib/db/repositories/tagsScanner';
import { getSettings } from '@/lib/config/settings';
import { resolveScannerLocale } from '@/lib/scanner/request';
import { turnstileSiteKey } from '@/lib/security/turnstile';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';
import { setScannerLanguageAction } from './actions';
import { ReportForm, type ReportLabels } from './ReportForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ tagId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The page a stranger reaches by scanning a sticker on a car — the whole point
 * of the product. It shows no more than the owner allowed, and sending a
 * message never reveals who they are.
 */
export default async function ScanPage({ params, searchParams }: Props) {
  const { tagId } = await params;
  const raw = await searchParams;
  const locale = await resolveScannerLocale();
  const t = await getTranslations({ locale, namespace: 'scanner' });

  const tag = await scannerTagsRepository.findForScanner(tagId);
  // Unknown, malformed, deactivated, suspended, lost: one answer for all.
  if (!tag) notFound();

  const sent = raw.sent === '1';
  const settings = await getSettings();

  const labels: ReportLabels = {
    category: t('form.category'),
    categories: Object.fromEntries(MESSAGE_CATEGORIES.map((key) => [key, t(`categories.${key}`)])),
    body: t('form.body'),
    bodyPlaceholder: t('form.bodyPlaceholder'),
    contact: t('form.contact'),
    contactHint: t('form.contactHint'),
    submit: t('form.submit'),
    sending: t('form.sending'),
    privacy: t('form.privacy'),
    challenge: t('form.challenge'),
    errors: {
      invalid: t('errors.invalid'),
      too_short: t('errors.too_short'),
      too_long: t('errors.too_long', { max: settings.maxMessageLength }),
      invalid_category: t('errors.invalid'),
      rate_limited: t('errors.rate_limited'),
      unavailable: t('errors.unavailable'),
      challenge_failed: t('errors.challenge_failed'),
      server_error: t('errors.server_error'),
    },
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-3">
        <Wordmark className="h-9" />
        <form action={setScannerLanguageAction} className="flex items-center gap-1">
          <input type="hidden" name="tagId" value={tag.publicTagId} />
          {locales.map((code) => (
            <button
              key={code}
              type="submit"
              name="lang"
              value={code}
              aria-current={code === locale ? 'true' : undefined}
              className={
                code === locale
                  ? 'rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink uppercase'
                  : 'rounded-full px-2.5 py-1 text-xs font-semibold text-text-secondary uppercase hover:bg-surface-3'
              }
            >
              {code}
            </button>
          ))}
        </form>
      </header>

      {sent ? (
        <section className="rounded-xl bg-white p-6 text-center shadow-card-sm">
          <h1 className="text-h2 text-text">{t('sent.title')}</h1>
          <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed text-text-secondary">
            {t('sent.body')}
          </p>
          <p className="mt-4 text-sm text-text-muted">{t('sent.privacy')}</p>
        </section>
      ) : (
        <>
          <section>
            <h1 className="text-h2 text-text">{t('title')}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">{t('subtitle')}</p>
            {tag.vehicle && (
              <p className="mt-4 inline-flex rounded-full bg-surface-3 px-4 py-2 text-[15px] font-bold text-text">
                {tag.vehicle.brand} {tag.vehicle.model} · {tag.vehicle.color}
              </p>
            )}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-card-sm md:p-6">
            <ReportForm tagId={tag.publicTagId} labels={labels} turnstileSiteKey={turnstileSiteKey()} />
          </section>
        </>
      )}

      <footer className="mt-auto pt-4 text-center text-sm text-text-muted">{t('footer')}</footer>
    </main>
  );
}
