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

  async get(owner: OwnerActor, vehicleId: string): Promise<VehicleDTO | null> {
    const ownerId = toObjectId(owner.userId);
    const id = toObjectId(vehicleId);
    if (!ownerId || !id) return null;
    await connectToDatabase();
    const doc = await VehicleModel.findOne({ _id: id, ownerId }).lean();
    return doc
      ? {
          brand: doc.brand,
          model: doc.model,
          color: doc.color,
          plateNumber: doc.plateNumber ?? null,
          showDetailsPublicly: doc.showDetailsPublicly,
          isActive: doc.isActive,
        }
      : null;
  },

  /** Owner edits: unknown or someone else's vehicle simply does not update. */
  async update(owner: OwnerActor, vehicleId: string, patch: Partial<NewVehicle>): Promise<{ ok: boolean }> {
    const ownerId = toObjectId(owner.userId);
    const id = toObjectId(vehicleId);
    if (!ownerId || !id) return { ok: false };
    await connectToDatabase();
    const result = await VehicleModel.updateOne({ _id: id, ownerId }, { $set: patch }, { runValidators: true });
    return { ok: result.matchedCount === 1 };
  },
};
