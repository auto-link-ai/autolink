/**
 * Repository: vehicles
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch VehicleModel. Every owner-facing function takes an
 * `OwnerActor` and filters by `ownerId: actor.userId`; a vehicle that belongs to
 * someone else is indistinguishable from one that does not exist.
 * The plate number is only ever returned in `VehicleDTO` (owner view), never in
 * `PublicVehicleView`. Returned objects never include `_id`.
 */
import 'server-only';
import type { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';
import { findOwnedVehicle } from './ownedVehicle';

/** Owner's own view of their vehicle. */
export interface VehicleDTO {
  brand: string;
  model: string;
  color: string;
  plateNumber: string | null;
  showDetailsPublicly: boolean;
  isActive: boolean;
}

/**
 * The ONLY vehicle shape allowed on /t/[tagId], and only when
 * `showDetailsPublicly` is true. No plate, no owner fields.
 */
export type PublicVehicleView = Pick<VehicleDTO, 'brand' | 'model' | 'color'>;

export interface NewVehicle {
  brand: string;
  model: string;
  color: string;
  plateNumber: string | null;
  showDetailsPublicly: boolean;
}

export const vehiclesRepository = {
  /** Created during activation, inside the same transaction as the tag claim. */
  async create(owner: OwnerActor, vehicle: NewVehicle, session?: ClientSession): Promise<string> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) throw new Error('vehicles.create: invalid owner id');
    await connectToDatabase();
    const [doc] = await VehicleModel.create([{ ...vehicle, ownerId }], { session });
    if (!doc) throw new Error('vehicles.create: nothing was created');
    return doc._id.toString();
  },

  /**
   * Owner edits, addressed by the sticker the car carries (rule 4: no vehicle
   * `_id` ever reaches the browser). Unknown or someone else's: no update.
   */
  async updateForSticker(owner: OwnerActor, publicTagId: string, patch: Partial<NewVehicle>): Promise<{ ok: boolean }> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned) return { ok: false };
    const result = await VehicleModel.updateOne(
      { _id: owned.vehicleId, ownerId: owned.ownerId },
      { $set: patch },
      { runValidators: true },
    );
    return { ok: result.matchedCount === 1 };
  },
};
