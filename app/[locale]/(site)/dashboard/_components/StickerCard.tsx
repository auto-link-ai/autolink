import { getTranslations } from 'next-intl/server';
import { dueSentence } from '@/components/care/DueList';
import { Button, buttonClasses } from '@/components/ui/Button';
import { PendingLink } from '@/components/ui/PendingLink';
import type { Locale } from '@/i18n/locales';
import type { DueItem } from '@/lib/care/due';
import { cx } from '@/lib/cx';
import type { OwnerTagRow } from '@/lib/db/repositories/tagsOwner';
import { formatDateTime } from '@/lib/format/date';
import { carDescribed, carName } from '@/lib/vehicles/carName';
import { toggleStickerAction } from '../actions';
import { VehicleForm } from './VehicleForm';

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
    <li className="rounded-xl bg-white p-5 shadow-card-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-text">
            {(tag.vehicle && carName(tag.vehicle)) ?? t('card.noVehicle')}
            {tag.vehicle?.color && <span className="text-text-muted"> · {tag.vehicle.color}</span>}
          </h3>
          {/* The sticker's id and since when: one quiet line. */}
          <p className="mt-1 text-sm text-text-muted">
            <span dir="ltr" className="font-mono text-text-secondary">
              {tag.publicTagId}
            </span>
            {tag.activatedAt && <> · {t('card.activatedOn', { date: formatDateTime(tag.activatedAt, locale) })}</>}
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

      {tag.vehicle && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {nextDue && (
            <p
              className={cx(
                'inline-flex items-center gap-2 self-start rounded-2xl px-3 py-1.5 text-sm font-bold',
                nextDue.status === 'overdue' ? 'bg-danger/10 text-danger' : 'bg-accent-soft text-accent',
              )}
            >
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />
              {t('card.nextDue', {
                item: tDue(`kinds.${nextDue.kind}`),
                when: await dueSentence(nextDue, locale),
              })}
            </p>
          )}
          <PendingLink
            href={`/${locale}/dashboard/car/${tag.publicTagId}`}
            className={buttonClasses('primary', 'md', 'w-full sm:order-first sm:w-auto')}
          >
            {t('card.book')}
          </PendingLink>
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

      {tag.vehicle &&
        tag.vehicleId &&
        (carDescribed(tag.vehicle) ? (
          <details className="group mt-4 border-t border-border pt-3">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[15px] font-bold text-accent">
              {t('card.edit')}
            </summary>
            <VehicleForm locale={locale} vehicleId={tag.vehicleId} vehicle={tag.vehicle} publicTagId={tag.publicTagId} />
          </details>
        ) : (
          // Linked first, described now: the one thing left to do, so it is open and in colour.
          <section
            aria-labelledby={`add-car-${tag.publicTagId}`}
            className="mt-5 rounded-2xl border-2 border-accent/40 bg-accent-soft p-4 sm:p-5"
          >
            <h4 id={`add-car-${tag.publicTagId}`} className="text-[17px] font-bold text-text">
              {t('card.addCar')}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{t('card.addCarHint')}</p>
            <VehicleForm locale={locale} vehicleId={tag.vehicleId} vehicle={tag.vehicle} publicTagId={tag.publicTagId} />
          </section>
        ))}

      {live ? (
        // Switching off makes the owner unreachable, so it asks once. <details>
        // needs no JavaScript: the first tap opens the question, the second acts.
        <details className="mt-4 border-t border-border pt-3">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-bold text-danger hover:underline">
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
