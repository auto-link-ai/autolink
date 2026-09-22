import { getTranslations } from 'next-intl/server';
import { DueChip, dueSentence } from '@/components/care/DueList';
import { buttonClasses } from '@/components/ui/Button';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import { algiersToday, dueItem } from '@/lib/care/due';
import { carBookPath, type CareLogSection } from '@/lib/care/sections';
import type { CarBookDTO } from '@/lib/db/repositories/carBook';
import { formatDay } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';
import { CareForm } from './CareForm';
import { BookCard } from './parts';
import { RecordList } from './RecordList';
import { formLabels, logFields } from './sectionConfig';

/**
 * Oil changes and repairs: what is next (oil), one clear button to log a new
 * entry, and the history. `adding` shows the form instead.
 */
export async function LogSection({
  section,
  book,
  locale,
  adding,
  currency,
  soonDays,
}: {
  section: CareLogSection;
  book: CarBookDTO;
  locale: Locale;
  adding: boolean;
  currency: string;
  soonDays: number;
}) {
  const t = await getTranslations('care');
  const records = section === 'oil' ? book.oilChanges : book.repairs;
  const sectionHref = carBookPath(locale, book.publicTagId, section);
  const addHref = `${sectionHref}?new=1`;

  if (adding) {
    return (
      <BookCard title={t(`${section}.add`)}>
        <CareForm
          locale={locale}
          tagId={book.publicTagId}
          section={section}
          fields={await logFields(section, currency)}
          labels={await formLabels('add')}
          cancelHref={sectionHref}
        />
      </BookCard>
    );
  }

  if (records.length === 0) {
    return (
      <BookCard>
        <p className="text-[16px] leading-relaxed text-text-secondary">{t(`${section}.emptyBody`)}</p>
        <PendingLink href={addHref} className={buttonClasses('primary', 'md', 'mt-5 w-full sm:w-auto')}>
          {t(`${section}.addFirst`)}
        </PendingLink>
      </BookCard>
    );
  }

  const latest = records[0]!;
  const next = section === 'oil' ? dueItem('OIL_CHANGE', latest.nextDueDate, latest.nextDueKm, algiersToday(), soonDays) : null;
  const km = (value: number) => t('record.km', { km: groupThousands(value) });

  return (
    <>
      {next && (
        <BookCard>
          <dl className="divide-y divide-border">
            <div className="flex flex-col gap-1 pb-4 sm:flex-row sm:gap-6">
              <dt className="text-sm font-semibold text-text-secondary sm:w-2/5">{t('oil.next')}</dt>
              <dd className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <span className={next.status === 'unset' ? 'text-[16px] text-text-muted' : 'text-[17px] font-semibold text-text'}>
                  {next.status === 'unset' ? t('notFilled') : await dueSentence(next, locale)}
                </span>
                {next.status !== 'unset' && <DueChip status={next.status} locale={locale} />}
              </dd>
            </div>
            <div className="flex flex-col gap-1 pt-4 sm:flex-row sm:gap-6">
              <dt className="text-sm font-semibold text-text-secondary sm:w-2/5">{t('oil.last')}</dt>
              <dd className="flex-1 text-[17px] font-semibold text-text">
                {[formatDay(latest.date, locale), latest.km !== null && km(latest.km), latest.oilType].filter(Boolean).join(' · ')}
              </dd>
            </div>
          </dl>
        </BookCard>
      )}

      <PendingLink href={addHref} className={buttonClasses('primary', 'md', 'w-full sm:w-auto sm:self-start')}>
        <span aria-hidden="true">+</span> {t(`${section}.add`)}
      </PendingLink>

      <BookCard title={t(`${section}.history`)}>
        <RecordList records={records} locale={locale} tagId={book.publicTagId} section={section} currency={currency} />
      </BookCard>
    </>
  );
}
