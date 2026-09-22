import { getTranslations } from 'next-intl/server';
import { dueSentence } from '@/components/care/DueList';
import { Button, buttonClasses } from '@/components/ui/Button';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import { cx } from '@/lib/cx';
import type { OwnerTagRow } from '@/lib/db/repositories/tagsOwner';
import { formatDateTime } from '@/lib/format/date';
import { toggleStickerAction, updateVehicleAction } from '../actions';

const INPUT =
  'h-11 w-full rounded-2xl border border-border bg-white px-3 text-[15px] text-text outline-none focus:border-accent';

/**
 * One sticker: which car it is on, its id, its state, and the controls to edit
 * the car or switch the sticker off. The id is what tells two stickers apart.
 */
export async function StickerCard({
  tag,
  locale,
  scanUrl,
  unread,
  nextDue,
}: {
  tag: OwnerTagRow;
  locale: Locale;
  scanUrl: string;
  /** Messages received through this sticker that the owner has not read. */
  unread: number;
  /** From the car book: something late or due soon, if anything. */
  nextDue: DueItem | null;
}) {
  const t = await getTranslations('dashboard');
  const tDue = await getTranslations('care.due');
  const live = tag.status === 'ACTIVE';

  return (
    <li className="rounded-xl bg-white p-6 shadow-card-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-h3 text-text">
            {tag.vehicle ? `${tag.vehicle.brand} ${tag.vehicle.model}` : t('card.noVehicle')}
            {tag.vehicle && <span className="text-text-muted"> · {tag.vehicle.color}</span>}
          </h3>
          <p dir="ltr" className="mt-1 font-mono text-sm text-text-secondary">
            {tag.publicTagId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
              {t('inbox.unread', { count: unread })}
            </span>
          )}
          <span
            className={cx(
              'rounded-full px-3 py-1 text-xs font-bold',
              live ? 'bg-success/10 text-success' : 'bg-surface-3 text-text-muted',
            )}
          >
            {t(`status.${tag.status}`)}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-text-muted">
        {tag.activatedAt ? t('card.activatedOn', { date: formatDateTime(tag.activatedAt, locale) }) : ''}
      </p>

      {tag.vehicle && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <PendingLink href={`/${locale}/dashboard/car/${tag.publicTagId}`} className={buttonClasses('primary', 'sm')}>
            {t('card.book')}
          </PendingLink>
          {nextDue && (
            <p className={cx('text-sm font-bold', nextDue.status === 'overdue' ? 'text-danger' : 'text-accent')}>
              {t('card.nextDue', {
                item: tDue(`kinds.${nextDue.kind}`),
                when: await dueSentence(nextDue, locale),
              })}
            </p>
          )}
        </div>
      )}
      {/* The owner's own view of the page a stranger reaches — worth more than its address. */}
      <a
        href={scanUrl}
        target="_blank"
        rel="noopener"
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent hover:underline"
      >
        {t('card.preview')}
        <span aria-hidden="true">↗</span>
      </a>

      {tag.vehicle && tag.vehicleId && (
        <details className="group mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer list-none text-[15px] font-bold text-accent">{t('card.edit')}</summary>
          <form action={updateVehicleAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="vehicleId" value={tag.vehicleId} />
            <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
              {t('card.brand')}
              <input name="brand" defaultValue={tag.vehicle.brand} maxLength={40} required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
              {t('card.model')}
              <input name="model" defaultValue={tag.vehicle.model} maxLength={40} required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
              {t('card.color')}
              <input name="color" defaultValue={tag.vehicle.color} maxLength={30} required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
              {t('card.plate')}
              <input
                name="plateNumber"
                defaultValue={tag.vehicle.plateNumber ?? ''}
                maxLength={20}
                dir="ltr"
                className={INPUT}
              />
            </label>
            <label className="flex items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                name="showDetailsPublicly"
                defaultChecked={tag.vehicle.showDetailsPublicly}
                className="mt-0.5 h-5 w-5 accent-[var(--orange)]"
              />
              <span className="text-sm text-text-secondary">{t('card.showDetails')}</span>
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" size="sm">
                {t('card.save')}
              </Button>
            </div>
          </form>
        </details>
      )}

      {live ? (
        // Switching off makes the owner unreachable, so it asks once. <details>
        // needs no JavaScript: the first tap opens the question, the second acts.
        <details className="mt-5 border-t border-border pt-4">
          <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-full border border-danger/40 px-4 text-sm font-bold text-danger hover:bg-danger/5">
            {t('card.deactivate')}
          </summary>
          <div className="mt-3 rounded-2xl bg-danger/5 p-4">
            <p className="text-sm leading-relaxed text-text">{t('card.deactivateConfirm')}</p>
            <form action={toggleStickerAction} className="mt-3">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="publicTagId" value={tag.publicTagId} />
              <input type="hidden" name="next" value="DEACTIVATED" />
              <Button type="submit" variant="danger" size="sm">
                {t('card.deactivateYes')}
              </Button>
            </form>
          </div>
        </details>
      ) : (
        <form action={toggleStickerAction} className="mt-5 border-t border-border pt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="publicTagId" value={tag.publicTagId} />
          <input type="hidden" name="next" value="ACTIVE" />
          <Button type="submit" variant="secondary" size="sm">
            {t('card.reactivate')}
          </Button>
          <span className="ms-3 text-sm text-text-muted">{t('card.reactivateHint')}</span>
        </form>
      )}
    </li>
  );
}
