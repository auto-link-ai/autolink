/**
 * Repository: renewals — owner side (asking for one)
 *
 * SECURITY BOUNDARY — only repositories import models.
 * - Every function takes an `OwnerActor` and filters by `ownerId`, so another
 *   account's sticker is indistinguishable from one that does not exist.
 * - Price and months arrive computed on the server from settings, never from
 *   the form.
 * - Confirming, cancelling and listing for the shop live in ./renewalsAdmin.ts.
 * Returned objects never include `_id`; a renewal is identified by its `ref`.
 */
import 'server-only';
import type { ClientSession, Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { RenewalModel } from '@/lib/db/models/renewal';
import { TagModel } from '@/lib/db/models/tag';
import { generateRenewalRef } from '@/lib/renewals/ref';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';

export type RequestRenewalResult = { ok: true; ref: string } | { ok: false };

/** An open request, as the owner's dashboard shows it. */
export interface PendingRenewal {
  ref: string;
  createdAt: Date;
}

function duplicateKey(error: unknown): Record<string, unknown> | null {
  const e = error as { code?: unknown; keyPattern?: Record<string, unknown> } | null;
  return e && e.code === 11000 ? (e.keyPattern ?? {}) : null;
}

/**
 * A sticker going back to the shop (taken back, or its account deleted): its
 * open requests are closed with it, inside the caller's transaction, so the
 * next owner never inherits someone else's renewal.
 */
export async function cancelOpenRenewalsWithin(
  session: ClientSession,
  match: { tagId: Types.ObjectId } | { ownerId: Types.ObjectId },
): Promise<void> {
  await RenewalModel.updateMany(
    { ...match, status: 'PENDING' },
    { $set: { status: 'CANCELLED', decidedAt: new Date() } },
    { session },
  );
}

export const renewalsRepository = {
  /**
   * The owner asking to extend one of their stickers. Only a sticker of theirs
   * that is on or switched off by them, and that has an end date. Asking again
   * while a request is open returns that request.
   */
  async request(
    owner: OwnerActor,
    publicTagId: string,
    terms: { price: number; months: number },
  ): Promise<RequestRenewalResult> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId || !isValidTagIdShape(publicTagId)) return { ok: false };
    await connectToDatabase();

    const tag = await TagModel.findOne(
      { publicTagId, ownerId, status: { $in: ['ACTIVE', 'DEACTIVATED'] }, serviceUntil: { $ne: null } },
      { _id: 1 },
    ).lean();
    if (!tag) return { ok: false };

    const open = async () => RenewalModel.findOne({ tagId: tag._id, status: 'PENDING' }, { _id: 0, ref: 1 }).lean();
    const existing = await open();
    if (existing) return { ok: true, ref: existing.ref };

    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = generateRenewalRef();
      try {
        await RenewalModel.create({ ref, tagId: tag._id, publicTagId, ownerId, price: terms.price, months: terms.months });
        return { ok: true, ref };
      } catch (error) {
        const key = duplicateKey(error);
        if (!key) throw error;
        // Two taps at once: the other one made the request.
        if ('tagId' in key) {
          const winner = await open();
          return winner ? { ok: true, ref: winner.ref } : { ok: false };
        }
        // A ref collision: draw another.
      }
    }
    throw new Error('renewals: could not draw a free reference');
  },

  /** The owner's open requests, by sticker. */
  async pendingForOwner(owner: OwnerActor): Promise<Map<string, PendingRenewal>> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return new Map();
    await connectToDatabase();
    const rows = await RenewalModel.find(
      { ownerId, status: 'PENDING' },
      { _id: 0, ref: 1, publicTagId: 1, createdAt: 1 },
    ).lean();
    return new Map(rows.map((row) => [row.publicTagId, { ref: row.ref, createdAt: row.createdAt }]));
  },
};
