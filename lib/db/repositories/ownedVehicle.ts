/**
 * The car book's one door: sticker id → car, for its owner only.
 *
 * SECURITY BOUNDARY — used by the car book repositories, never by a route.
 * Both lookups filter by the owner, so another account's sticker, an unknown
 * one and a malformed id all come back as null alike. The ids it returns stay
 * inside the repository layer (rule 4).
 */
import 'server-only';
import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { VehicleModel } from '@/lib/db/models/vehicle';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';

export interface OwnedVehicle {
  vehicleId: Types.ObjectId;
  ownerId: Types.ObjectId;
}

export async function findOwnedVehicle(owner: OwnerActor, publicTagId: string): Promise<OwnedVehicle | null> {
  const ownerId = toObjectId(owner.userId);
  if (!ownerId || !isValidTagIdShape(publicTagId)) return null;
  await connectToDatabase();

  const tag = await TagModel.findOne({ publicTagId, ownerId }, { vehicleId: 1 }).lean();
  if (!tag?.vehicleId) return null;
  const vehicle = await VehicleModel.exists({ _id: tag.vehicleId, ownerId });
  return vehicle ? { vehicleId: tag.vehicleId, ownerId } : null;
}
