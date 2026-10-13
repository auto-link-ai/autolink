/**
 * Repository: users (vehicle owners) — signing in, and the owner's own account
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module and the
 * customers* admin modules are the only code allowed to touch UserModel.
 * Owner-facing functions take an `OwnerActor` and read or write only
 * `_id: actor.userId`. Lookups by phone exist solely for signing in, activating
 * a sticker and resetting a PIN. `pinHash` leaves this module only through
 * `findForPinLogin` and `pinHashFor`, to be verified. Returned objects never
 * include `_id`.
 */
import 'server-only';
import type { Locale } from '@/i18n/locales';
import { connectToDatabase } from '@/lib/db/connect';
import { UserModel } from '@/lib/db/models/user';
import type { UserStatus } from '@/lib/domain/constants';
import { generatePublicUserId } from '@/lib/tags/generate';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';

export interface UserDTO {
  firstName: string;
  lastName: string;
  phone: string;
  locale: Locale;
  whatsappReminders: boolean;
  status: UserStatus;
}

/** Just enough to verify a sign-in; never leaves the auth layer. */
export interface PinCandidate {
  id: string;
  pinHash: string;
  status: UserStatus;
  sessionVersion: number;
}

/** What the session check needs on every request. */
export interface SessionUser {
  id: string;
  firstName: string;
  phone: string;
  status: UserStatus;
  sessionVersion: number;
}

export const usersRepository = {
  /** Sign-in only: the hash is needed to verify the PIN. */
  async findForPinLogin(phone: string): Promise<PinCandidate | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ phone }).select('+pinHash').lean();
    return doc
      ? { id: doc._id.toString(), pinHash: doc.pinHash, status: doc.status, sessionVersion: doc.sessionVersion ?? 0 }
      : null;
  },

  /** Activation and PIN reset: does this (already proven) number have an account? */
  async findByPhone(phone: string): Promise<{ id: string; status: UserStatus } | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ phone }, { status: 1 }).lean();
    return doc ? { id: doc._id.toString(), status: doc.status } : null;
  },

  /** Session check: does this account still exist, is it allowed in, which session version? */
  async findById(id: string): Promise<SessionUser | null> {
    const objectId = toObjectId(id);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId, { firstName: 1, phone: 1, status: 1, sessionVersion: 1 }).lean();
    return doc
      ? {
          id: doc._id.toString(),
          firstName: doc.firstName ?? '',
          phone: doc.phone,
          status: doc.status,
          sessionVersion: doc.sessionVersion ?? 0,
        }
      : null;
  },

  async getProfile(owner: OwnerActor): Promise<UserDTO | null> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId).lean();
    if (!doc) return null;
    return {
      firstName: doc.firstName ?? '',
      lastName: doc.lastName ?? '',
      phone: doc.phone,
      locale: doc.locale,
      whatsappReminders: doc.whatsappReminders ?? false,
      status: doc.status,
    };
  },

  /** The owner's own PIN hash, so the change-PIN action can verify the current one. */
  async pinHashFor(owner: OwnerActor): Promise<string | null> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId).select('+pinHash').lean();
    return doc?.pinHash ?? null;
  },

  /**
   * A new PIN — chosen by the owner, reset by WhatsApp code, or issued by an
   * admin. The session version moves on, so every device signed in with the
   * old PIN is signed out. Returns the new version, or null if no account.
   * Callers go through lib/auth/pinChange.ts, which also clears the rest.
   */
  async setPin(userId: string, pinHash: string): Promise<number | null> {
    const objectId = toObjectId(userId);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findOneAndUpdate(
      { _id: objectId },
      { $set: { pinHash }, $inc: { sessionVersion: 1 } },
      { returnDocument: 'after', projection: { sessionVersion: 1 }, lean: true },
    );
    return doc ? doc.sessionVersion : null;
  },

  async setWhatsAppReminders(owner: OwnerActor, on: boolean): Promise<{ ok: boolean }> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ _id: objectId }, { $set: { whatsappReminders: on } });
    return { ok: result.matchedCount === 1 };
  },

  async touchLastLogin(id: string): Promise<void> {
    const objectId = toObjectId(id);
    if (!objectId) return;
    await connectToDatabase();
    await UserModel.updateOne({ _id: objectId }, { $set: { lastLoginAt: new Date() } });
  },

  /** Backfill only (`pnpm backfill:user-ids`): accounts created before public ids existed. */
  async backfillPublicIds(): Promise<number> {
    await connectToDatabase();
    const missing = await UserModel.find({ publicUserId: { $in: [null, ''] } }, { _id: 1 }).lean();
    let updated = 0;
    for (const doc of missing) {
      await UserModel.updateOne({ _id: doc._id }, { $set: { publicUserId: generatePublicUserId() } });
      updated++;
    }
    return updated;
  },
};
