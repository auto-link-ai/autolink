/**
 * Repository: renewals — admin side (the shop collecting and confirming)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor`; confirming and cancelling write an audit entry in the same
 * transaction. Returned objects never include `_id` (rule 4): renewals are
 * identified by `ref`, owners by `publicUserId`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { RenewalModel } from '@/lib/db/models/renewal';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { RenewalStatus, TagStatus } from '@/lib/domain/constants';
import { extendServiceUntil } from '@/lib/renewals/period';
import { isValidRenewalRef } from '@/lib/renewals/ref';
import { carLabel } from '@/lib/vehicles/carName';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';

/** Decided requests shown under the open ones, for a look back. */
const RECENT_DECIDED = 20;

export interface AdminRenewalRow {
  ref: string;
  status: RenewalStatus;
  publicTagId: string;
  price: number;
  months: number;
  createdAt: Date;
  decidedAt: Date | null;
  /** Null once the account has been deleted. */
  owner: { name: string; phone: string; publicUserId: string } | null;
  car: string | null;
  serviceUntil: Date | null;
  tagStatus: TagStatus | null;
}

export type DecideRenewalResult =
  | { ok: true; serviceUntil?: Date }
  | { ok: false; reason: 'not_found' | 'conflict' | 'unavailable' };

export const adminRenewalsRepository = {
  /** Every open request (oldest first: it has waited longest), then the latest decided ones. */
  async listForAdmin(_admin: AdminActor): Promise<AdminRenewalRow[]> {
    await connectToDatabase();
    const fields = { ref: 1, status: 1, tagId: 1, publicTagId: 1, ownerId: 1, price: 1, months: 1, createdAt: 1, decidedAt: 1 };
    const [open, decided] = await Promise.all([
      RenewalModel.find({ status: 'PENDING' }, fields).sort({ createdAt: 1 }).lean(),
      RenewalModel.find({ status: { $ne: 'PENDING' } }, fields).sort({ decidedAt: -1 }).limit(RECENT_DECIDED).lean(),
    ]);
    const rows = [...open, ...decided];
    if (rows.length === 0) return [];

    const [tags, users] = await Promise.all([
      TagModel.find({ _id: { $in: rows.map((r) => r.tagId) } }, { status: 1, serviceUntil: 1, vehicleId: 1, ownerId: 1 }).lean(),
      UserModel.find(
        { _id: { $in: rows.map((r) => r.ownerId) } },
        { firstName: 1, lastName: 1, phone: 1, publicUserId: 1 },
      ).lean(),
    ]);
    const vehicleIds = tags.map((t) => t.vehicleId).filter((id) => id !== null);
    const vehicles = vehicleIds.length
      ? await VehicleModel.find({ _id: { $in: vehicleIds } }, { brand: 1, model: 1, color: 1 }).lean()
      : [];
    const tagById = new Map(tags.map((t) => [t._id.toString(), t]));
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const vehicleById = new Map(vehicles.map((v) => [v._id.toString(), v]));

    return rows.map((row) => {
      const tag = tagById.get(row.tagId.toString());
      // The sticker may have changed hands since: its date and car only count while it is still theirs.
      const stillTheirs = tag?.ownerId?.equals(row.ownerId) ?? false;
      const user = userById.get(row.ownerId.toString());
      const vehicle = stillTheirs && tag?.vehicleId ? vehicleById.get(tag.vehicleId.toString()) : undefined;
      return {
        ref: row.ref,
        status: row.status,
        publicTagId: row.publicTagId,
        price: row.price,
        months: row.months,
        createdAt: row.createdAt,
        decidedAt: row.decidedAt,
        owner: user
          ? { name: `${user.firstName} ${user.lastName}`.trim(), phone: user.phone, publicUserId: user.publicUserId }
          : null,
        car: vehicle ? carLabel(vehicle) : null,
        serviceUntil: stillTheirs ? (tag?.serviceUntil ?? null) : null,
        tagStatus: stillTheirs ? (tag?.status ?? null) : null,
      };
    });
  },

  async countPending(_admin: AdminActor): Promise<number> {
    await connectToDatabase();
    return RenewalModel.countDocuments({ status: 'PENDING' });
  },

  /**
   * The payment is in: the request is confirmed and the sticker's end moves
   * forward by the months it was asked for — from its current end, or from
   * today if that has passed. Only while the sticker is still the requester's.
   */
  async confirm(admin: AdminActor, ref: string, now: Date = new Date()): Promise<DecideRenewalResult> {
    if (!isValidRenewalRef(ref)) return { ok: false, reason: 'not_found' };
    const mongoose = await connectToDatabase();
    const renewal = await RenewalModel.findOne({ ref }, { tagId: 1, ownerId: 1, publicTagId: 1, status: 1, price: 1, months: 1 }).lean();
    if (!renewal) return { ok: false, reason: 'not_found' };
    if (renewal.status !== 'PENDING') return { ok: false, reason: 'conflict' };

    let result: DecideRenewalResult = { ok: false, reason: 'conflict' };
    await mongoose.connection.transaction(async (session) => {
      result = { ok: false, reason: 'conflict' };
      const tag = await TagModel.findOne({ _id: renewal.tagId, ownerId: renewal.ownerId }, { serviceUntil: 1 })
        .session(session)
        .lean();
      if (!tag) {
        result = { ok: false, reason: 'unavailable' };
        return;
      }
      const before = tag.serviceUntil ?? null;
      const after = extendServiceUntil(before, now, renewal.months);
      const decided = await RenewalModel.updateOne(
        { _id: renewal._id, status: 'PENDING' },
        { $set: { status: 'CONFIRMED', decidedAt: now } },
        { session },
      );
      if (decided.modifiedCount !== 1) return;
      await TagModel.updateOne({ _id: tag._id }, { $set: { serviceUntil: after } }, { session });
      await auditLogsRepository.append(
        admin,
        {
          action: 'RENEWAL_CONFIRM',
          targetType: 'renewal',
          targetId: ref,
          metadata: { publicTagId: renewal.publicTagId, price: renewal.price, months: renewal.months, before, after },
        },
        session,
      );
      result = { ok: true, serviceUntil: after };
    });
    return result;
  },

  /** No payment came, or the owner changed their mind. The sticker is not touched. */
  async cancel(admin: AdminActor, ref: string, now: Date = new Date()): Promise<DecideRenewalResult> {
    if (!isValidRenewalRef(ref)) return { ok: false, reason: 'not_found' };
    const mongoose = await connectToDatabase();
    const renewal = await RenewalModel.findOne({ ref }, { publicTagId: 1, status: 1 }).lean();
    if (!renewal) return { ok: false, reason: 'not_found' };

    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const decided = await RenewalModel.updateOne(
        { _id: renewal._id, status: 'PENDING' },
        { $set: { status: 'CANCELLED', decidedAt: now } },
        { session },
      );
      applied = decided.modifiedCount === 1;
      if (!applied) return;
      await auditLogsRepository.append(
        admin,
        { action: 'RENEWAL_CANCEL', targetType: 'renewal', targetId: ref, metadata: { publicTagId: renewal.publicTagId } },
        session,
      );
    });
    return applied ? { ok: true } : { ok: false, reason: 'conflict' };
  },
};
