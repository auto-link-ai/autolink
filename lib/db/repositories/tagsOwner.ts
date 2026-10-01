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
  vehicleId: string | null;
  vehicle: { brand: string; model: string; color: string; plateNumber: string | null; showDetailsPublicly: boolean } | null;
}

export type ClaimResult = { ok: true } | { ok: false; reason: 'taken' };

export const ownerTagsRepository = {
  /**
   * Creates the vehicle and links the sticker in one transaction. Only a
   * sticker nobody owns (`UNASSIGNED`, no owner) links; the same filter on the
   * update means two people racing for one sticker cannot both win.
   */
  async claim(owner: OwnerActor, publicTagId: string, vehicle: NewVehicle): Promise<ClaimResult> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return { ok: false, reason: 'taken' };
    const mongoose = await connectToDatabase();

    let claimed = false;
    await mongoose.connection.transaction(async (session) => {
      const free = await TagModel.exists({ publicTagId, status: 'UNASSIGNED', ownerId: null }).session(session);
      if (!free) return;
      const vehicleId = await vehiclesRepository.create(owner, vehicle, session);
      const result = await TagModel.updateOne(
        { publicTagId, status: 'UNASSIGNED', ownerId: null },
        {
          $set: {
            status: 'ACTIVE',
            ownerId,
            vehicleId: toObjectId(vehicleId),
            activatedAt: new Date(),
            activationAttempts: 0,
            lockedUntil: null,
          },
        },
        { session },
      );
      claimed = result.modifiedCount === 1;
      if (!claimed) {
        // Someone else claimed it first: undo the vehicle we just created.
        await VehicleModel.deleteOne({ _id: toObjectId(vehicleId) }, { session });
        return;
      }
      await auditLogsRepository.append(
        { kind: 'system' },
        {
          action: 'TAG_ACTIVATE',
          targetType: 'tag',
          targetId: publicTagId,
          metadata: { userId: owner.userId },
        },
        session,
      );
    });

    return claimed ? { ok: true } : { ok: false, reason: 'taken' };
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
        vehicleId: tag.vehicleId?.toString() ?? null,
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
