/**
 * Repository: tags — owner side (activation and "my stickers")
 *
 * SECURITY BOUNDARY — only repositories import models.
 * - `findForActivation` is the ONLY place `activationCodeHash` is read; it
 *   returns the hash to the activation service and nothing else ever sees it.
 * - Every other function takes an `OwnerActor` and filters by
 *   `ownerId: actor.userId`, so another account's sticker is indistinguishable
 *   from one that does not exist.
 * Returned objects never include `_id`; tags are identified by `publicTagId`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { TagStatus } from '@/lib/domain/constants';
import type { OwnerActor } from './actor';
import { auditLogsRepository } from './auditLogs';
import { toObjectId } from './objectId';
import { vehiclesRepository, type NewVehicle } from './vehicles';

/** Five wrong codes lock the sticker for a day (spec §2.7). */
export const ACTIVATION_MAX_ATTEMPTS = 5;
export const ACTIVATION_LOCK_HOURS = 24;

export interface ActivationCandidate {
  publicTagId: string;
  status: TagStatus;
  activationCodeHash: string;
  lockedUntil: Date | null;
}

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
  /** Activation only: returns the stored hash so the service can verify a code. */
  async findForActivation(publicTagId: string): Promise<ActivationCandidate | null> {
    await connectToDatabase();
    const doc = await TagModel.findOne({ publicTagId })
      .select('+activationCodeHash publicTagId status lockedUntil')
      .lean();
    return doc
      ? {
          publicTagId: doc.publicTagId,
          status: doc.status,
          activationCodeHash: doc.activationCodeHash,
          lockedUntil: doc.lockedUntil,
        }
      : null;
  },

  /**
   * Counts one wrong code. At ACTIVATION_MAX_ATTEMPTS the sticker is locked for
   * ACTIVATION_LOCK_HOURS, so a stolen sticker id cannot be brute-forced.
   */
  async registerFailedAttempt(publicTagId: string, now: Date = new Date()): Promise<void> {
    await connectToDatabase();
    const doc = await TagModel.findOneAndUpdate(
      { publicTagId },
      { $inc: { activationAttempts: 1 } },
      { returnDocument: 'after', projection: { activationAttempts: 1 } },
    ).lean();
    if (doc && doc.activationAttempts >= ACTIVATION_MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + ACTIVATION_LOCK_HOURS * 60 * 60 * 1000);
      await TagModel.updateOne({ publicTagId }, { $set: { lockedUntil, activationAttempts: 0 } });
    }
  },

  /**
   * Creates the vehicle and claims the sticker in one transaction. The filter
   * keeps `status: 'UNASSIGNED', ownerId: null`, so two people racing on the
   * same code cannot both win.
   */
  async claim(owner: OwnerActor, publicTagId: string, vehicle: NewVehicle): Promise<ClaimResult> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return { ok: false, reason: 'taken' };
    const mongoose = await connectToDatabase();

    let claimed = false;
    await mongoose.connection.transaction(async (session) => {
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
