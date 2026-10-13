/**
 * Repository: tags — owner side (linking a sticker and "my stickers")
 *
 * SECURITY BOUNDARY — only repositories import models.
 * - `claim` links a sticker nobody owns yet to the signed-in customer.
 * - Every other function takes an `OwnerActor` and filters by
 *   `ownerId: actor.userId`, so another account's sticker is indistinguishable
 *   from one that does not exist.
 * Returned objects never include `_id`; tags are identified by `publicTagId`.
 */
import 'server-only';
import type { ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { TagStatus } from '@/lib/domain/constants';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { AdminActor, OwnerActor } from './actor';
import { auditLogsRepository } from './auditLogs';
import { toObjectId } from './objectId';
import { vehiclesRepository, type NewVehicle } from './vehicles';

/** One sticker as its owner sees it. */
export interface OwnerTagRow {
  publicTagId: string;
  status: TagStatus;
  activatedAt: Date | null;
  vehicle: { brand: string; model: string; color: string; plateNumber: string | null; showDetailsPublicly: boolean } | null;
}

export type ClaimResult = { ok: true } | { ok: false; reason: 'taken' };

/** Thrown inside a transaction so that everything else in it rolls back too. */
export class StickerTakenError extends Error {
  constructor() {
    super('sticker is not free');
    this.name = 'StickerTakenError';
  }
}

/**
 * Links a free sticker (`UNASSIGNED`, no owner) to `owner` with a new car,
 * inside the caller's transaction. Throws `StickerTakenError` when it is not
 * free — including when someone else won the race between the check and the
 * update — so the caller's transaction rolls back whatever it did before (a
 * new account, say) instead of committing half an activation.
 */
export async function claimWithin(
  session: ClientSession,
  owner: OwnerActor,
  publicTagId: string,
  vehicle: NewVehicle,
): Promise<void> {
  const ownerId = toObjectId(owner.userId);
  if (!ownerId) throw new StickerTakenError();
  const free = await TagModel.exists({ publicTagId, status: 'UNASSIGNED', ownerId: null }).session(session);
  if (!free) throw new StickerTakenError();
  const vehicleId = await vehiclesRepository.create(owner, vehicle, session);
  const result = await TagModel.updateOne(
    { publicTagId, status: 'UNASSIGNED', ownerId: null },
    { $set: { status: 'ACTIVE', ownerId, vehicleId: toObjectId(vehicleId), activatedAt: new Date() } },
    { session },
  );
  if (result.modifiedCount !== 1) throw new StickerTakenError();
  await auditLogsRepository.append(
    { kind: 'system' },
    { action: 'TAG_ACTIVATE', targetType: 'tag', targetId: publicTagId, metadata: { userId: owner.userId } },
    session,
  );
}

export const ownerTagsRepository = {
  /**
   * A signed-in owner adding a sticker: the car and the link, in one
   * transaction. Two people racing for one sticker cannot both win.
   */
  async claim(owner: OwnerActor, publicTagId: string, vehicle: NewVehicle): Promise<ClaimResult> {
    const mongoose = await connectToDatabase();
    try {
      await mongoose.connection.transaction((session) => claimWithin(session, owner, publicTagId, vehicle));
      return { ok: true };
    } catch (error) {
      if (error instanceof StickerTakenError) return { ok: false, reason: 'taken' };
      throw error;
    }
  },

  /** "My stickers": the owner's tags with the vehicle each is attached to. */
  async listForOwner(owner: OwnerActor): Promise<OwnerTagRow[]> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return [];
    await connectToDatabase();
    const tags = await TagModel.find(
      { ownerId },
      { _id: 0, publicTagId: 1, status: 1, activatedAt: 1, vehicleId: 1 },
    )
      .sort({ activatedAt: -1 })
      .lean();

    const vehicleIds = tags.map((tag) => tag.vehicleId).filter((id) => id !== null);
    const vehicles = vehicleIds.length
      ? await VehicleModel.find({ _id: { $in: vehicleIds }, ownerId }).lean()
      : [];
    const byId = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));

    return tags.map((tag) => {
      const vehicle = tag.vehicleId ? byId.get(tag.vehicleId.toString()) : undefined;
      return {
        publicTagId: tag.publicTagId,
        status: tag.status,
        activatedAt: tag.activatedAt,
        vehicle: vehicle
          ? {
              brand: vehicle.brand,
              model: vehicle.model,
              color: vehicle.color,
              plateNumber: vehicle.plateNumber ?? null,
              showDetailsPublicly: vehicle.showDetailsPublicly,
            }
          : null,
      };
    });
  },

  /**
   * The same list, for an admin looking at one customer's account. It resolves
   * the account by its public id, so no Mongo `_id` ever travels through the
   * page layer to get here.
   */
  async listForOwnerAdmin(_admin: AdminActor, publicUserId: string): Promise<OwnerTagRow[]> {
    if (!isValidPublicUserId(publicUserId)) return [];
    await connectToDatabase();
    const user = await UserModel.findOne({ publicUserId }, { _id: 1 }).lean();
    if (!user) return [];
    return this.listForOwner({ kind: 'owner', userId: user._id.toString() });
  },

  /** The owner turning their own sticker off and on again. */
  async setOwnerStatus(owner: OwnerActor, publicTagId: string, status: 'ACTIVE' | 'DEACTIVATED'): Promise<{ ok: boolean }> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return { ok: false };
    await connectToDatabase();
    // Only the owner's own ACTIVE/DEACTIVATED tags: a SUSPENDED or LOST tag is
    // an admin decision the owner cannot undo.
    const result = await TagModel.updateOne(
      { publicTagId, ownerId, status: status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' },
      { $set: { status } },
    );
    return { ok: result.modifiedCount === 1 };
  },
};
