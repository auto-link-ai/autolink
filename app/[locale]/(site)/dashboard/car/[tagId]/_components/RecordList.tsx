import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { CareLogSection } from '@/lib/care/sections';
import type { ServiceRecordDTO } from '@/lib/db/repositories/carBook';
import { formatDzd } from '@/lib/format/currency';
import { formatDay } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';
import { deleteServiceRecordAction } from '../actions';

/**
 * Past oil changes or repairs, newest first. Deleting asks once; the button
 * names the entry it deletes, for anyone listening rather than looking.
 */
export async function RecordList({
  records,
  locale,
  tagId,
  section,
  currency,
}: {
  records: ServiceRecordDTO[];
  locale: Locale;
  tagId: string;
  section: CareLogSection;
  currency: string;
}) {
  const t = await getTranslations('care.record');
  const km = (value: number) => t('km', { km: groupThousands(value) });

  return (
    <ul className="divide-y divide-border">
      {records.map((record) => {
        const date = formatDay(record.date, locale);
        const next = [record.nextDueDate && formatDay(record.nextDueDate, locale), record.nextDueKm !== null && km(record.nextDueKm)]
          .filter(Boolean)
          .join(' · ');
        const details = [record.work, record.oilType, record.garage].filter(Boolean).join(' · ');
        return (
          <li key={record.publicId} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[16px] font-bold text-text">
                {date}
                {record.km !== null && <span className="font-semibold text-text-secondary"> · {km(record.km)}</span>}
              </p>
              {record.costDzd !== null && (
                <span dir="ltr" className="text-[15px] font-semibold text-text-secondary">
                  {formatDzd(record.costDzd, currency)}
                </span>
              )}
            </div>
            {details && <p className="mt-0.5 text-[15px] text-text">{details}</p>}
            {next && <p className="mt-0.5 text-sm text-text-secondary">{t('next', { value: next })}</p>}
            {record.note && <p className="mt-1 text-sm whitespace-pre-line text-text-muted">{record.note}</p>}

            <details className="mt-2">
              <summary
                aria-label={t('deleteLabel', { date })}
                className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full px-1 text-sm font-bold text-danger underline-offset-4 hover:underline"
              >
                {t('delete')}
              </summary>
              <div className="mt-1 rounded-2xl bg-danger/5 p-4">
                <p className="text-[15px] text-text">{t('deleteConfirm')}</p>
                <form action={deleteServiceRecordAction} className="mt-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="tagId" value={tagId} />
                  <input type="hidden" name="section" value={section} />
                  <input type="hidden" name="recordId" value={record.publicId} />
                  <Button type="submit" variant="danger">
                    {t('deleteYes')}
                  </Button>
                </form>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
