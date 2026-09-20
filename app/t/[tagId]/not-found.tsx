import { getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/Wordmark';
import { resolveScannerLocale } from '@/lib/scanner/request';

/**
 * One state for every sticker that cannot be used: never existed, malformed,
 * not yet activated, switched off by its owner, suspended or lost. They must be
 * indistinguishable, or the page becomes a way to probe which stickers exist
 * (rule 9). Same words, same status code, every time.
 */
export default async function ScanNotFound() {
  const locale = await resolveScannerLocale();
  const t = await getTranslations({ locale, namespace: 'scanner' });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-6 px-5 py-8">
      <Wordmark className="h-9" />
      <section className="rounded-xl bg-white p-6 text-center shadow-card-sm">
        <h1 className="text-h2 text-text">{t('unavailable.title')}</h1>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed text-text-secondary">
          {t('unavailable.body')}
        </p>
      </section>
      <footer className="mt-auto pt-4 text-center text-sm text-text-muted">{t('footer')}</footer>
    </main>
  );
}
