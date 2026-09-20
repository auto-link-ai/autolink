'use server';

import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { getOwnerSession } from '@/lib/auth/session';
import { ownerTagsRepository } from '@/lib/db/repositories/tagsOwner';
import { vehiclesRepository } from '@/lib/db/repositories/vehicles';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import { vehicleSchema } from '@/lib/validation/vehicle';

function back(locale: string, result: string): never {
  redirect(`/${locale}/dashboard?result=${result}`);
}

/** The owner turning their own sticker off (or back on). */
export async function toggleStickerAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const publicTagId = formData.get('publicTagId');
  const next = formData.get('next');
  if (!isValidTagIdShape(publicTagId) || (next !== 'ACTIVE' && next !== 'DEACTIVATED')) back(locale, 'invalid');

  const result = await ownerTagsRepository.setOwnerStatus(session.actor, publicTagId, next);
  back(locale, result.ok ? 'ok' : 'invalid');
}

/** Edit the car attached to a sticker. */
export async function updateVehicleAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const vehicleId = String(formData.get('vehicleId') ?? '');
  const parsed = vehicleSchema.safeParse({
    brand: formData.get('brand') ?? '',
    model: formData.get('model') ?? '',
    color: formData.get('color') ?? '',
    plateNumber: formData.get('plateNumber') ?? '',
    showDetailsPublicly: formData.get('showDetailsPublicly') ?? undefined,
  });
  if (!parsed.success) back(locale, 'invalid');

  // The repository filters by ownerId: someone else's vehicle simply does not update.
  const result = await vehiclesRepository.update(session.actor, vehicleId, parsed.data);
  back(locale, result.ok ? 'ok' : 'invalid');
}
