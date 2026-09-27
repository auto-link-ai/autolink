import { getTranslations } from 'next-intl/server';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { buttonClasses } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { AdminTagRow } from '@/lib/db/repositories/tags';
import type { TagAction } from '@/lib/domain/constants';
import { formatDateTime } from '@/lib/format/date';
import { canDeleteTag, canTakeBackTag } from '@/lib/tags/adminRules';
import { availableActions } from '@/lib/tags/transitions';
import { changeTagStatusAction, deleteTagAction, takeBackTagAction } from '../actions';
import { StatusBadge } from './StatusBadge';

const ACTION_STYLE: Record<TagAction, 'secondary' | 'danger'> = {
  suspend: 'secondary',
  deactivate: 'secondary',
  reactivate: 'secondary',
  markLost: 'danger',
};

export async function TagsTable({
  rows,
  locale,
  returnSearch,
  canEdit,
}: {
  rows: AdminTagRow[];
  locale: Locale;
  /** Current list query, so an action returns to the same filtered page. */
  returnSearch: string;
  /** Delete and take back: ADMIN role only. */
  canEdit: boolean;
}) {
  const t = await getTranslations('admin.tags');
  if (rows.length === 0) return <p className="py-6 text-sm text-text-muted">{t('list.empty')}</p>;

  return (
    <div className="-mx-5 overflow-x-auto md:mx-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th scope="col" className="px-5 py-2 text-start font-semibold md:px-3">{t('list.tagId')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('list.status')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('list.batch')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('list.activated')}</th>
            <th scope="col" className="px-3 py-2 text-start font-semibold">{t('list.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.publicTagId}>
              <td className="px-5 py-3 font-mono font-semibold md:px-3" dir="ltr">
                {row.publicTagId}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={row.status} label={t(`status.${row.status}`)} />
              </td>
              <td className="px-3 py-3 text-text-secondary">{row.batchLabel ?? '—'}</td>
              <td className="px-3 py-3 text-text-secondary">
                {row.activatedAt ? formatDateTime(row.activatedAt, locale) : '—'}
              </td>
              <td className="px-3 py-3">
                <form action={changeTagStatusAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="publicTagId" value={row.publicTagId} />
                  <input type="hidden" name="returnSearch" value={returnSearch} />
                  {availableActions(row.status).map((action) => (
                    <button
                      key={action}
                      type="submit"
                      name="action"
                      value={action}
                      className={buttonClasses(ACTION_STYLE[action], 'sm')}
                    >
                      {t(`actions.${action}`)}
                    </button>
                  ))}
                </form>
                {canEdit && (canDeleteTag(row) || canTakeBackTag(row)) && (
                  <div className="mt-2">
                    {canDeleteTag(row) ? (
                      <ConfirmAction
                        summary={t('edit.delete')}
                        message={t('edit.deleteConfirm', { tagId: row.publicTagId })}
                        confirm={t('edit.deleteYes')}
                        action={deleteTagAction}
                        fields={{ locale, publicTagId: row.publicTagId, returnSearch }}
                      />
                    ) : (
                      <ConfirmAction
                        summary={t('edit.takeBack')}
                        message={t('edit.takeBackConfirm', { tagId: row.publicTagId })}
                        confirm={t('edit.takeBackYes')}
                        action={takeBackTagAction}
                        fields={{ locale, publicTagId: row.publicTagId, returnSearch }}
                      />
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
