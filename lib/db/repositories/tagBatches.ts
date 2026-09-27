/**
 * Repository: tagBatches
 *
 * SECURITY BOUNDARY — only repositories import models. Admin-only: every
 * function takes an `AdminActor`, and every mutation writes its audit entry in
 * the same transaction. Batches are identified by `publicId`, never `_id`.
 * Activation codes arrive here already hashed; plaintext never reaches the DB.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { TagBatchModel } from '@/lib/db/models/tagBatch';
import { TAG_STATUSES, type TagStatus } from '@/lib/domain/constants';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';
import { toObjectId } from './objectId';

export interface TagBatchDTO {
  publicId: string;
  label: string;
  quantity: number;
  createdAt: Date;
  createdByEmail: string | null;
  statusCounts: Record<TagStatus, number>;
  /** Never used and not promised to an order: what « clean up » would delete. */
  unused: number;
}

export interface NewBatchTag {
  publicTagId: string;
  activationCodeHash: string;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

function emptyCounts(): Record<TagStatus, number> {
  return Object.fromEntries(TAG_STATUSES.map((s) => [s, 0])) as Record<TagStatus, number>;
}

export const tagBatchesRepository = {
  /**
   * Creates the batch, its tags (UNASSIGNED) and the audit entry atomically.
   * Returns `{ created: false }` if a tag id or batch id collided.
   */
  async createWithTags(
    admin: AdminActor,
    input: { publicId: string; label: string; tags: NewBatchTag[] },
  ): Promise<{ created: boolean }> {
    const adminId = toObjectId(admin.adminId);
    if (!adminId) throw new Error('Invalid admin actor.');
    const mongoose = await connectToDatabase();

    try {
      await mongoose.connection.transaction(async (session) => {
        const [batch] = await TagBatchModel.create(
          [{ publicId: input.publicId, label: input.label, quantity: input.tags.length, createdByAdminId: adminId }],
          { session },
        );
        if (!batch) throw new Error('Batch was not created.');
        await TagModel.insertMany(
          input.tags.map((tag) => ({
            publicTagId: tag.publicTagId,
            activationCodeHash: tag.activationCodeHash,
            status: 'UNASSIGNED',
            batchId: batch._id,
          })),
          { session },
        );
        await auditLogsRepository.append(
          admin,
          {
            action: 'TAG_BATCH_CREATE',
            targetType: 'tagBatch',
            targetId: input.publicId,
            metadata: { label: input.label, quantity: input.tags.length },
          },
          session,
        );
      });
      return { created: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { created: false };
      throw error;
    }
  },

  /** Most recent batches first, with how many of their tags are in each status. */
  async listForAdmin(_admin: AdminActor, limit = 50): Promise<TagBatchDTO[]> {
    await connectToDatabase();
    const rows = await TagBatchModel.aggregate<{
      publicId: string;
      label: string;
      quantity: number;
      createdAt: Date;
      createdByEmail?: string;
      statuses: TagStatus[];
      unused: number;
    }>([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'tags',
          localField: '_id',
          foreignField: 'batchId',
          as: 'tags',
          pipeline: [{ $project: { _id: 0, status: 1, orderId: 1 } }],
        },
      },
      {
        $lookup: {
          from: 'adminUsers',
          localField: 'createdByAdminId',
          foreignField: '_id',
          as: 'admins',
          pipeline: [{ $project: { _id: 0, email: 1 } }],
        },
      },
      {
        $project: {
          _id: 0,
          publicId: 1,
          label: 1,
          quantity: 1,
          createdAt: 1,
          createdByEmail: { $first: '$admins.email' },
          statuses: '$tags.status',
          unused: {
            $size: {
              $filter: {
                input: '$tags',
                cond: {
                  $and: [{ $eq: ['$$this.status', 'UNASSIGNED'] }, { $eq: [{ $ifNull: ['$$this.orderId', null] }, null] }],
                },
              },
            },
          },
        },
      },
    ]);

    return rows.map((row) => {
      const statusCounts = emptyCounts();
      for (const status of row.statuses) statusCounts[status] += 1;
      return {
        publicId: row.publicId,
        label: row.label,
        quantity: row.quantity,
        createdAt: row.createdAt,
        createdByEmail: row.createdByEmail ?? null,
        statusCounts,
        unused: row.unused,
      };
    });
  },

  /** Tag ids in the batch that have not been activated yet (the only ones a reissue may touch). */
  async findUnassignedTags(
    _admin: AdminActor,
    batchPublicId: string,
  ): Promise<{ label: string; publicTagIds: string[] } | null> {
    await connectToDatabase();
    const batch = await TagBatchModel.findOne({ publicId: batchPublicId }, { _id: 1, label: 1 }).lean();
    if (!batch) return null;
    const tags = await TagModel.find({ batchId: batch._id, status: 'UNASSIGNED' }, { _id: 0, publicTagId: 1 })
      .sort({ publicTagId: 1 })
      .lean();
    return { label: batch.label, publicTagIds: tags.map((t) => t.publicTagId) };
  },

  /**
   * Replaces activation-code hashes for tags that are STILL unassigned (checked
   * inside the transaction). Returns the ids actually updated — the caller must
   * only print codes for those. Resets activation attempts and lockouts.
   */
  async replaceActivationHashes(
    admin: AdminActor,
    batchPublicId: string,
    entries: NewBatchTag[],
  ): Promise<string[]> {
    const mongoose = await connectToDatabase();
    const batch = await TagBatchModel.findOne({ publicId: batchPublicId }, { _id: 1 }).lean();
    if (!batch) return [];
    const ids = entries.map((e) => e.publicTagId);
    let updated: string[] = [];

    await mongoose.connection.transaction(async (session) => {
      await TagModel.bulkWrite(
        entries.map((entry) => ({
          updateOne: {
            filter: { publicTagId: entry.publicTagId, batchId: batch._id, status: 'UNASSIGNED' },
            update: {
              $set: { activationCodeHash: entry.activationCodeHash, activationAttempts: 0, lockedUntil: null },
            },
          },
        })),
        { session },
      );
      const stillUnassigned = await TagModel.find(
        { publicTagId: { $in: ids }, batchId: batch._id, status: 'UNASSIGNED' },
        { _id: 0, publicTagId: 1 },
        { session },
      ).lean();
      updated = stillUnassigned.map((t) => t.publicTagId);
      await auditLogsRepository.append(
        admin,
        {
          action: 'TAG_BATCH_REISSUE',
          targetType: 'tagBatch',
          targetId: batchPublicId,
          metadata: { reissued: updated.length },
        },
        session,
      );
    });

    return updated;
  },
};
