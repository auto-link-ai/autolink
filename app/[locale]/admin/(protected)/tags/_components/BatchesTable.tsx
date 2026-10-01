import { getTranslations } from 'next-intl/server';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import type { Locale } from '@/i18n/locales';
import type { TagBatchDTO } from '@/lib/db/repositories/tagBatches';
import { TAG_STATUSES } from '@/lib/domain/constants';
import { formatDateTime } from '@/lib/format/date';
import { cleanBatchAction } from '../actions';
import { StatusBadge } from './StatusBadge';

export async function BatchesTable({
  batches,
  locale,
  canEdit,
  returnSearch,
}: {
  batches: TagBatchDTO[];
  locale: Locale;
  /** Clean up unused stickers: ADMIN role only. */
  canEdit: boolean;
  returnSearch: string;
}) {
  const t = await getTranslations('admin.tags');
  if (batches.length === 0) return <p className="text-sm text-text-muted">{t('batches.empty')}</p>;

  return (
    <div className="-mx-5 overflow-x-auto md:mx-0">
      <table className="w-full min-w-[720px] text-start text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th scope="col" className="px-5 py-2 text-start font-semibold md:px-3">{t('batches.label')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('batches.quantity')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('batches.created')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('batches.statuses')}</th>
            {canEdit && <th scope="col" className="px-3 py-2"><span className="sr-only">{t('list.actions')}</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {batches.map((batch) => (
            <tr key={batch.publicId} className="align-top">
              <td className="px-5 py-3 md:px-3">
                <div className="font-semibold text-text">{batch.label}</div>
                <div className="font-mono text-xs text-text-muted" dir="ltr">{batch.publicId}</div>
              </td>
              <td className="px-3 py-3 tabular-nums">{batch.quantity}</td>
              <td className="px-3 py-3">
                <div>{formatDateTime(batch.createdAt, locale)}</div>
                {batch.createdByEmail && (
                  <div className="text-xs text-text-muted" dir="ltr">
                    {t('batches.createdBy')} {batch.createdByEmail}
                  </div>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {TAG_STATUSES.filter((s) => batch.statusCounts[s] > 0).map((s) => (
                    <StatusBadge key={s} status={s} label={`${t(`status.${s}`)} · ${batch.statusCounts[s]}`} />
                  ))}
                </div>
              </td>
              {canEdit && (
                <td className="flex flex-col items-start gap-2 px-3 py-3">
                  {canEdit && batch.unused > 0 && (
                    <ConfirmAction
                      summary={t('edit.clean', { count: batch.unused })}
                      message={t('edit.cleanConfirm', { count: batch.unused })}
                      confirm={t('edit.cleanYes')}
                      action={cleanBatchAction}
                      fields={{ locale, batchPublicId: batch.publicId, returnSearch }}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
