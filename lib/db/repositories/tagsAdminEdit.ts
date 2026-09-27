/**
 * Repository: stickers — admin clean-up (delete unused, take one back)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor`; every change writes its audit entry in the same transaction.
 * Only never-used stickers are ever deleted: the query itself says so, so a
 * sticker activated a moment ago cannot slip through.
 */
import 'server-only';
import type { ClientSession, Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
import { TagModel } from '@/lib/db/models/tag';
import { TagBatchModel } from '@/lib/db/models/tagBatch';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';

/** Never used and not promised to an order — lib/tags/adminRules.ts `canDeleteTag`, as a query. */
const UNUSED = { status: 'UNASSIGNED', ownerId: null, vehicleId: null, orderId: null } as const;

export type TagEditResult = { ok: true } | { ok: false; reason: 'not_found' | 'not_allowed' | 'conflict' };

/** A batch with no sticker left has nothing to show: it goes too. */
async function dropBatchIfEmpty(admin: AdminActor, batchId: Types.ObjectId | null, session: ClientSession): Promise<boolean> {
  if (!batchId) return false;
  if ((await TagModel.countDocuments({ batchId }, { session })) > 0) return false;
  const batch = await TagBatchModel.findOneAndDelete({ _id: batchId }, { session, projection: { publicId: 1 } }).lean();
  if (!batch) return false;
  await auditLogsRepository.append(admin, { action: 'BATCH_DELETE', targetType: 'batch', targetId: batch.publicId }, session);
  return true;
}

export const adminTagEditsRepository = {
  /** One never-used sticker, deleted. */
  async removeUnused(admin: AdminActor, publicTagId: string): Promise<TagEditResult> {
    const mongoose = await connectToDatabase();
    const tag = await TagModel.findOne({ publicTagId }, { _id: 1, batchId: 1 }).lean();
    if (!tag) return { ok: false, reason: 'not_found' };

    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      applied = (await TagModel.deleteOne({ _id: tag._id, ...UNUSED }, { session })).deletedCount === 1;
      if (!applied) return;
      await auditLogsRepository.append(admin, { action: 'TAG_DELETE', targetType: 'tag', targetId: publicTagId }, session);
      await dropBatchIfEmpty(admin, tag.batchId, session);
    });
    return applied ? { ok: true } : { ok: false, reason: 'not_allowed' };
  },

  /** Every never-used sticker of a batch, deleted; used ones are never touched. */
  async removeUnusedInBatch(
    admin: AdminActor,
    batchPublicId: string,
  ): Promise<{ ok: true; deleted: number; batchRemoved: boolean } | { ok: false; reason: 'not_found' }> {
    const mongoose = await connectToDatabase();
    const batch = await TagBatchModel.findOne({ publicId: batchPublicId }, { _id: 1 }).lean();
    if (!batch) return { ok: false, reason: 'not_found' };

    let deleted = 0;
    let batchRemoved = false;
    await mongoose.connection.transaction(async (session) => {
      deleted = (await TagModel.deleteMany({ batchId: batch._id, ...UNUSED }, { session })).deletedCount;
      await auditLogsRepository.append(
        admin,
        { action: 'BATCH_CLEANUP', targetType: 'batch', targetId: batchPublicId, metadata: { deleted } },
        session,
      );
      batchRemoved = await dropBatchIfEmpty(admin, batch._id, session);
    });
    return { ok: true, deleted, batchRemoved };
  },

  /**
   * Takes a sticker back from its customer: unassigned again, its old activation
   * code replaced (`disabledCodeHash`) so the old slip no longer works — reissue
   * the batch's codes before handing it out. That car and its car book are
   * deleted unless another sticker still points at it; the customer keeps the
   * messages they already received.
   */
  async takeBack(admin: AdminActor, publicTagId: string, disabledCodeHash: string): Promise<TagEditResult> {
    const mongoose = await connectToDatabase();
    const tag = await TagModel.findOne({ publicTagId }, { _id: 1, ownerId: 1, vehicleId: 1 }).lean();
    if (!tag) return { ok: false, reason: 'not_found' };
    if (!tag.ownerId) return { ok: false, reason: 'not_allowed' };

    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const result = await TagModel.updateOne(
        { _id: tag._id, ownerId: tag.ownerId },
        {
          $set: {
            status: 'UNASSIGNED',
            ownerId: null,
            vehicleId: null,
            activatedAt: null,
            activationCodeHash: disabledCodeHash,
            activationAttempts: 0,
            lockedUntil: null,
          },
        },
        { session },
      );
      applied = result.modifiedCount === 1;
      if (!applied) return;
      let carDeleted = false;
      if (tag.vehicleId && (await TagModel.countDocuments({ vehicleId: tag.vehicleId }, { session })) === 0) {
        await ServiceRecordModel.deleteMany({ vehicleId: tag.vehicleId }, { session });
        carDeleted = (await VehicleModel.deleteOne({ _id: tag.vehicleId }, { session })).deletedCount === 1;
      }
      await auditLogsRepository.append(
        admin,
        { action: 'TAG_TAKE_BACK', targetType: 'tag', targetId: publicTagId, metadata: { carDeleted } },
        session,
      );
    });
    return applied ? { ok: true } : { ok: false, reason: 'conflict' };
  },
};
