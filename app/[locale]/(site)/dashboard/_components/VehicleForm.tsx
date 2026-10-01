import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/i18n/locales';
import type { OwnerTagRow } from '@/lib/db/repositories/tagsOwner';
import { updateVehicleAction } from '../actions';

const INPUT =
  'h-11 w-full rounded-2xl border border-border bg-white px-3 text-[15px] text-text outline-none focus:border-accent';

/**
 * The car a sticker is on: make, model, colour (with the usual colours to pick
 * from), plate, and whether strangers may see the first three. Used to
 * describe the car after linking, and to change it later.
 */
export async function VehicleForm({
  locale,
  vehicleId,
  vehicle,
  publicTagId,
}: {
  locale: Locale;
  vehicleId: string;
  vehicle: NonNullable<OwnerTagRow['vehicle']>;
  publicTagId: string;
}) {
  const t = await getTranslations('dashboard.card');
  const colorsId = `car-colors-${publicTagId}`;

  return (
    <form action={updateVehicleAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
        {t('brand')}
        <input name="brand" defaultValue={vehicle.brand} maxLength={40} required className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
        {t('model')}
        <input name="model" defaultValue={vehicle.model} maxLength={40} required className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
        {t('color')}
        <input name="color" defaultValue={vehicle.color} maxLength={30} required list={colorsId} className={INPUT} />
        <datalist id={colorsId}>
          {(t.raw('colors') as string[]).map((colour) => (
            <option key={colour} value={colour} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
        {t('plate')}
        <input name="plateNumber" defaultValue={vehicle.plateNumber ?? ''} maxLength={20} dir="ltr" className={INPUT} />
      </label>
      <label className="flex items-start gap-3 sm:col-span-2">
        <input
          type="checkbox"
          name="showDetailsPublicly"
          defaultChecked={vehicle.showDetailsPublicly}
          className="mt-0.5 h-5 w-5 accent-[var(--orange)]"
        />
        <span className="text-sm text-text-secondary">{t('showDetails')}</span>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" size="sm">
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
