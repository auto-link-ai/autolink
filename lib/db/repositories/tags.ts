/**
 * Repository: tags
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch TagModel.
 * - Admin functions take an `AdminActor`; status changes follow
 *   lib/tags/transitions.ts and write an audit entry in the same transaction.
 * - Owner functions (Phase 3) take an `OwnerActor` and filter by `ownerId`.
 * - The public scanner lookup (Phase 2) returns `PublicTagView | null` and
 *   nothing else: UNASSIGNED, DEACTIVATED, SUSPENDED, LOST and missing tags all
 *   return `null`, so callers cannot distinguish them (rule 9).
 * Returned objects never include `_id`; tags are identified by `publicTagId`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { TAG_STATUSES, type TagAction, type TagStatus } from '@/lib/domain/constants';
import { canApply, targetStatus } from '@/lib/tags/transitions';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';
import type { PublicVehicleView } from './vehicles';

/** Owner/admin view of a tag. */
export interface TagDTO {
  publicTagId: string;
  status: TagStatus;
  activatedAt: Date | null;
}

/** What /t/[tagId] may know about an ACTIVE tag. */
export interface PublicTagView {
  publicTagId: string;
  vehicle: PublicVehicleView | null;
}

export interface AdminTagRow {
  publicTagId: string;
  status: TagStatus;
  batchLabel: string | null;
  activatedAt: Date | null;
  createdAt: Date;
  /** A customer holds it (it can be taken back). */
  hasOwner: boolean;
  /** Promised to an order (it cannot be deleted). */
  onOrder: boolean;
}

export interface AdminTagPage {
  items: AdminTagRow[];
  total: number;
  page: number;
  pageCount: number;
}

export type TransitionResult =
  | { ok: true; from: TagStatus; to: TagStatus }
  | { ok: false; reason: 'not_found' | 'not_allowed' | 'conflict' };

/** One line of the dashboard's activation feed. */
export interface ActivatedTagRow {
  publicTagId: string;
  status: TagStatus;
  activatedAt: Date;
}

export const ADMIN_TAG_PAGE_SIZE = 50;

export const tagsRepository = {
  /** How many tags sit in each state — the admin overview's tag row. */
  async countByStatus(_admin: AdminActor): Promise<Record<TagStatus, number>> {
    await connectToDatabase();
    const rows = await TagModel.aggregate<{ _id: TagStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(TAG_STATUSES.map((status) => [status, 0])) as Record<TagStatus, number>;
    for (const row of rows) if (row._id in counts) counts[row._id] = row.count;
    return counts;
  },

  /** The stickers customers claimed most recently — the dashboard's activity list. */
  async recentlyActivated(_admin: AdminActor, limit = 5): Promise<ActivatedTagRow[]> {
    await connectToDatabase();
    return TagModel.find(
      { activatedAt: { $ne: null } },
      { _id: 0, publicTagId: 1, activatedAt: 1, status: 1 },
    )
      .sort({ activatedAt: -1 })
      .limit(limit)
      .lean<ActivatedTagRow[]>();
  },

  /** Which of these ids already exist (collision check before a batch is created). */
  async findExistingPublicTagIds(_admin: AdminActor, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    await connectToDatabase();
    const docs = await TagModel.find({ publicTagId: { $in: ids } }, { _id: 0, publicTagId: 1 }).lean();
    return new Set(docs.map((d) => d.publicTagId));
  },

  /**
   * Paged admin list. `idPrefix` is a Crockford-only fragment of the id body
   * (validated by the caller), matched as an anchored prefix.
   */
  async listForAdmin(
    _admin: AdminActor,
    options: { status?: TagStatus; idPrefix?: string; page: number },
  ): Promise<AdminTagPage> {
    await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (options.status) filter.status = options.status;
    if (options.idPrefix) {
      if (!/^[0-9A-HJKMNP-TV-Z]{1,8}$/.test(options.idPrefix)) {
        return { items: [], total: 0, page: 1, pageCount: 1 };
      }
      filter.publicTagId = { $regex: `^AUT-${options.idPrefix}` };
    }

    const total = await TagModel.countDocuments(filter);
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_TAG_PAGE_SIZE));
    const page = Math.min(Math.max(1, options.page), pageCount);

    const items = await TagModel.aggregate<AdminTagRow>([
      { $match: filter },
      { $sort: { createdAt: -1, publicTagId: 1 } },
      { $skip: (page - 1) * ADMIN_TAG_PAGE_SIZE },
      { $limit: ADMIN_TAG_PAGE_SIZE },
      {
        $lookup: {
          from: 'tagBatches',
          localField: 'batchId',
          foreignField: '_id',
          as: 'batch',
          pipeline: [{ $project: { _id: 0, label: 1 } }],
        },
      },
      {
        $project: {
          _id: 0,
          publicTagId: 1,
          status: 1,
          activatedAt: 1,
          createdAt: 1,
          batchLabel: { $ifNull: [{ $first: '$batch.label' }, null] },
          // A missing field and null both mean "none".
          hasOwner: { $ne: [{ $ifNull: ['$ownerId', null] }, null] },
          onOrder: { $ne: [{ $ifNull: ['$orderId', null] }, null] },
        },
      },
    ]);

    return { items, total, page, pageCount };
  },

  /** Applies an admin status change if the transition table allows it. */
  async transition(admin: AdminActor, publicTagId: string, action: TagAction): Promise<TransitionResult> {
    const mongoose = await connectToDatabase();
    const tag = await TagModel.findOne({ publicTagId }, { status: 1, ownerId: 1, vehicleId: 1 }).lean();
    if (!tag) return { ok: false, reason: 'not_found' };
    if (!canApply(action, tag.status)) return { ok: false, reason: 'not_allowed' };

    const from = tag.status;
    const to = targetStatus(action, { hasOwner: Boolean(tag.ownerId && tag.vehicleId) });
    let applied = false;

    await mongoose.connection.transaction(async (session) => {
      // Optimistic check: only update if the status is still what we read.
      const result = await TagModel.updateOne({ _id: tag._id, status: from }, { $set: { status: to } }, { session });
      applied = result.modifiedCount === 1;
      if (!applied) return;
      await auditLogsRepository.append(
        admin,
        { action: 'TAG_STATUS_CHANGE', targetType: 'tag', targetId: publicTagId, metadata: { action, from, to } },
        session,
      );
    });

    return applied ? { ok: true, from, to } : { ok: false, reason: 'conflict' };
  },
};
