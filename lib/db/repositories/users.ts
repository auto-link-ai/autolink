/**
 * Repository: users (vehicle owners)
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch UserModel. Every owner-facing function takes an
 * `OwnerActor` and reads/writes only `_id: actor.userId`. Lookups by email exist
 * solely for the login/registration path. `passwordHash` is never returned
 * except by `findForLogin`, which the sign-in path uses to verify it.
 * Returned objects never include `_id`.
 */
import 'server-only';
import type { Locale } from '@/i18n/locales';
import { connectToDatabase } from '@/lib/db/connect';
import { UserModel } from '@/lib/db/models/user';
import type { UserStatus } from '@/lib/domain/constants';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';

export interface UserDTO {
  email: string;
  name: string | null;
  phone: string | null;
  locale: Locale;
  emailNotifications: boolean;
  emailVerified: boolean;
  status: UserStatus;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string | null;
  phone: string | null;
  locale: Locale;
}

/** Just enough to verify a sign-in; never leaves the auth layer. */
export interface LoginCandidate {
  id: string;
  passwordHash: string;
  status: UserStatus;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export const usersRepository = {
  /** Registration. Returns `{ created: false }` when the email is already taken. */
  async create(user: NewUser): Promise<{ created: boolean; id?: string }> {
    await connectToDatabase();
    try {
      const doc = await UserModel.create(user);
      return { created: true, id: doc._id.toString() };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { created: false };
      throw error;
    }
  },

  /** Sign-in path only: the hash is needed to verify the password. */
  async findForLogin(email: string): Promise<LoginCandidate | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .lean();
    return doc ? { id: doc._id.toString(), passwordHash: doc.passwordHash, status: doc.status } : null;
  },

  /** Session check: does this account still exist and is it still allowed in? */
  async findById(id: string): Promise<{ id: string; email: string; status: UserStatus } | null> {
    const objectId = toObjectId(id);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId, { email: 1, status: 1 }).lean();
    return doc ? { id: doc._id.toString(), email: doc.email, status: doc.status } : null;
  },

  async getProfile(owner: OwnerActor): Promise<UserDTO | null> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId).lean();
    if (!doc) return null;
    return {
      email: doc.email,
      name: doc.name ?? null,
      phone: doc.phone ?? null,
      locale: doc.locale,
      emailNotifications: doc.emailNotifications,
      emailVerified: doc.emailVerifiedAt !== null,
      status: doc.status,
    };
  },

  async updateProfile(
    owner: OwnerActor,
    patch: Partial<Pick<NewUser, 'name' | 'phone' | 'locale'>> & { emailNotifications?: boolean },
  ): Promise<{ ok: boolean }> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ _id: objectId }, { $set: patch }, { runValidators: true });
    return { ok: result.matchedCount === 1 };
  },

  async touchLastLogin(id: string): Promise<void> {
    const objectId = toObjectId(id);
    if (!objectId) return;
    await connectToDatabase();
    await UserModel.updateOne({ _id: objectId }, { $set: { lastLoginAt: new Date() } });
  },

  /** Script-only (`pnpm user:password`): replaces a customer's password. */
  async setPasswordHash(email: string, passwordHash: string): Promise<boolean> {
    await connectToDatabase();
    const result = await UserModel.updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { passwordHash } },
    );
    return result.matchedCount === 1;
  },
};
