/**
 * Repository: renewal warnings — SYSTEM ONLY (the daily cron)
 *
 * SECURITY BOUNDARY — only repositories import models. Takes a `SystemActor`;
 * never reachable from a page. It returns whose sticker stops soon; the
 * internal `ref` it hands back is only ever passed back to `markWarned`, never
 * out of the server, and the cron route answers with counts alone.
 *
 * A warning is due when a live sticker's service ends within the window, it
 * has not been sent for that exact end date yet, and no renewal is already
 * waiting for the shop. Blocked accounts get none.
 */
import 'server-only';
import type { Types } from 'mongoose';
import type { Locale } from '@/i18n/locales';
import { connectToDatabase } from '@/lib/db/connect';
import { RenewalModel } from '@/lib/db/models/renewal';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import { carName } from '@/lib/vehicles/carName';
import type { SystemActor } from './actor';

export interface DueRenewalWarning {
  /** Internal: the tag to mark afterwards. */
  ref: Types.ObjectId;
  userId: string;
  locale: Locale;
  phone: string;
  firstName: string;
  publicTagId: string;
  /** « Peugeot 3008 », or null while the car is not described yet. */
  carLabel: string | null;
  serviceUntil: Date;
}

export const renewalWarningsRepository = {
  async findDue(_system: SystemActor, now: Date, horizon: Date): Promise<DueRenewalWarning[]> {
    await connectToDatabase();
    const tags = await TagModel.find(
      { status: 'ACTIVE', serviceUntil: { $gt: now, $lte: horizon } },
      { publicTagId: 1, ownerId: 1, vehicleId: 1, serviceUntil: 1, renewalWarnedFor: 1 },
    ).lean();
    const due = tags.filter((tag) => tag.ownerId && tag.serviceUntil && tag.renewalWarnedFor?.getTime() !== tag.serviceUntil.getTime());
    if (due.length === 0) return [];

    const [asked, users, vehicles] = await Promise.all([
      RenewalModel.find({ tagId: { $in: due.map((tag) => tag._id) }, status: 'PENDING' }, { tagId: 1 }).lean(),
      UserModel.find(
        { _id: { $in: due.map((tag) => tag.ownerId) }, status: 'ACTIVE' },
        { locale: 1, phone: 1, firstName: 1 },
      ).lean(),
      VehicleModel.find({ _id: { $in: due.map((tag) => tag.vehicleId).filter((id) => id !== null) } }, { brand: 1, model: 1 }).lean(),
    ]);
    const alreadyAsked = new Set(asked.map((renewal) => renewal.tagId.toString()));
    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    const labelByVehicle = new Map(vehicles.map((v) => [v._id.toString(), carName(v)]));

    return due.flatMap((tag) => {
      const user = tag.ownerId ? userById.get(tag.ownerId.toString()) : undefined;
      if (!user?.phone || !tag.serviceUntil || alreadyAsked.has(tag._id.toString())) return [];
      return [
        {
          ref: tag._id,
          userId: user._id.toString(),
          locale: user.locale,
          phone: user.phone,
          firstName: user.firstName ?? '',
          publicTagId: tag.publicTagId,
          carLabel: tag.vehicleId ? (labelByVehicle.get(tag.vehicleId.toString()) ?? null) : null,
          serviceUntil: tag.serviceUntil,
        },
      ];
    });
  },

  /**
   * Records the end date warned about, so it is never sent twice. Only while
   * the end is still that date: a renewal confirmed meanwhile keeps its own.
   */
  async markWarned(_system: SystemActor, warning: DueRenewalWarning): Promise<void> {
    await connectToDatabase();
    await TagModel.updateOne(
      { _id: warning.ref, serviceUntil: warning.serviceUntil },
      { $set: { renewalWarnedFor: warning.serviceUntil } },
    );
  },
};
