import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { ServiceRecordDTO } from '@/lib/db/repositories/carBook';
import { formatDzd } from '@/lib/format/currency';
import { formatDay } from '@/lib/format/date';
import { groupThousands } from '@/lib/format/number';
import { deleteServiceRecordAction } from '../actions';

/** Past oil changes or repairs, newest first; each can be deleted after one "are you sure?". */
export async function RecordList({
  records,
  locale,
  tagId,
  currency,
  heading,
  empty,
}: {
  records: ServiceRecordDTO[];
  locale: Locale;
  tagId: string;
  currency: string;
  heading: string;
  empty: string;
}) {
  const t = await getTranslations('care.record');
  const km = (value: number) => t('km', { km: groupThousands(value) });

  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="text-[15px] font-bold text-text">{heading}</h3>
      {records.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {records.map((record) => {
            const next = [record.nextDueDate && formatDay(record.nextDueDate, locale), record.nextDueKm !== null && km(record.nextDueKm)]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={record.publicId} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-bold text-text">
                    {formatDay(record.date, locale)}
                    {record.km !== null && <span className="font-normal text-text-secondary"> · {km(record.km)}</span>}
                  </p>
                  {record.costDzd !== null && (
                    <span dir="ltr" className="text-sm text-text-secondary">
                      {formatDzd(record.costDzd, currency)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary">
                  {[record.work, record.oilType, record.garage].filter(Boolean).join(' · ')}
                </p>
                {next && <p className="text-sm text-text-secondary">{t('next', { value: next })}</p>}
                {record.note && <p className="mt-1 text-sm whitespace-pre-line text-text-muted">{record.note}</p>}

                <details className="mt-1">
                  <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-sm font-bold text-danger">
                    {t('delete')}
                  </summary>
                  <div className="mt-1 rounded-2xl bg-danger/5 p-3">
                    <p className="text-sm text-text">{t('deleteConfirm')}</p>
                    <form action={deleteServiceRecordAction} className="mt-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="tagId" value={tagId} />
                      <input type="hidden" name="recordId" value={record.publicId} />
                      <Button type="submit" variant="danger" size="sm">
                        {t('deleteYes')}
                      </Button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
