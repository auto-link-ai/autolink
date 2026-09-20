import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
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
export async function StickerCard({ tag, locale, scanUrl }: { tag: OwnerTagRow; locale: Locale; scanUrl: string }) {
  const t = await getTranslations('dashboard');
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
        <span
          className={cx(
            'rounded-full px-3 py-1 text-xs font-bold',
            live ? 'bg-success/10 text-success' : 'bg-surface-3 text-text-muted',
          )}
        >
          {t(`status.${tag.status}`)}
        </span>
      </div>

      <p className="mt-3 text-sm text-text-muted">
        {tag.activatedAt ? t('card.activatedOn', { date: formatDateTime(tag.activatedAt, locale) }) : ''}
      </p>
      <p className="mt-1 break-all text-sm text-text-secondary">
        {t('card.scanUrl')}: <span dir="ltr">{scanUrl}</span>
      </p>

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

      <form action={toggleStickerAction} className="mt-5 border-t border-border pt-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="publicTagId" value={tag.publicTagId} />
        <input type="hidden" name="next" value={live ? 'DEACTIVATED' : 'ACTIVE'} />
        <Button type="submit" variant={live ? 'danger' : 'secondary'} size="sm">
          {live ? t('card.deactivate') : t('card.reactivate')}
        </Button>
        <span className="ms-3 text-sm text-text-muted">{live ? t('card.deactivateHint') : t('card.reactivateHint')}</span>
      </form>
    </li>
  );
}
