import { getTranslations } from 'next-intl/server';
import { DueList } from '@/components/care/DueList';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import type { CarSummaryDTO } from '@/lib/db/repositories/carBook';

/**
 * What the owner sees on scanning their OWN sticker while signed in — never
 * rendered for anyone else (the page decides that on the server). Plain HTML:
 * the scan page stays inside its JavaScript budget.
 */
export async function OwnerPanel({
  summary,
  items,
  locale,
}: {
  summary: CarSummaryDTO;
  items: DueItem[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: 'scanner.owner' });
  const tDue = await getTranslations({ locale, namespace: 'care.due' });
  const { car, publicTagId } = summary;

  return (
    <>
      <section>
        <h1 className="text-h2 text-text">{t('title')}</h1>
        <p className="mt-2 inline-flex rounded-full bg-surface-3 px-4 py-2 text-[15px] font-bold text-text">
          {car.brand} {car.model} · {car.color}
        </p>
        <p className="mt-3 text-sm text-text-muted">{t('private')}</p>
      </section>

      <section aria-labelledby="owner-due" className="rounded-xl bg-white p-5 shadow-card-sm md:p-6">
        <h2 id="owner-due" className="text-h3 text-text">
          {tDue('title')}
        </h2>
        <div className="mt-2">
          <DueList items={items} locale={locale} />
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <a href={`/${locale}/dashboard/car/${publicTagId}`} className={buttonClasses('primary', 'md', 'w-full')}>
          {t('openBook')}
        </a>
        <a href={`/${locale}/dashboard`} className={buttonClasses('secondary', 'md', 'w-full')}>
          {t('messages')}
        </a>
        <a href={`/t/${publicTagId}?view=public`} className="min-h-11 py-2 text-center text-sm font-bold text-accent hover:underline">
          {t('preview')}
        </a>
      </div>
    </>
  );
}
