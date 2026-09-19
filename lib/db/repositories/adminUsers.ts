/**
 * Repository: adminUsers
 *
 * SECURITY BOUNDARY — only repositories import models. Admin accounts are
 * separate from owner accounts (separate collection, session, and login page).
 * The password hash is `select: false` and is only returned by `findForLogin`,
 * which exists solely for the login action. Other functions never return
 * `passwordHash`, and nothing returned here is sent to a client as-is.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { AdminUserModel } from '@/lib/db/models/adminUser';
import type { AdminRole } from '@/lib/domain/constants';
import { toObjectId } from './objectId';

export interface AdminUserDTO {
  email: string;
  role: AdminRole;
  lastLoginAt: Date | null;
}

/** Server-side only: carries the id for the session token and the hash for verification. */
export interface AdminLoginRecord {
  id: string;
  role: AdminRole;
  passwordHash: string;
}

export const adminUsersRepository = {
  async findForLogin(email: string): Promise<AdminLoginRecord | null> {
    await connectToDatabase();
    const doc = await AdminUserModel.findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .lean();
    if (!doc) return null;
    return { id: doc._id.toString(), role: doc.role, passwordHash: doc.passwordHash };
  },

  /** Looks up the admin named in a verified session token. */
  async findById(id: string): Promise<AdminUserDTO | null> {
    const _id = toObjectId(id);
    if (!_id) return null;
    await connectToDatabase();
    const doc = await AdminUserModel.findById(_id).lean();
    return doc ? { email: doc.email, role: doc.role, lastLoginAt: doc.lastLoginAt } : null;
  },

  async touchLastLogin(id: string): Promise<void> {
    const _id = toObjectId(id);
    if (!_id) return;
    await connectToDatabase();
    await AdminUserModel.updateOne({ _id }, { $set: { lastLoginAt: new Date() } });
  },

  /**
   * Script-only (`pnpm admin:password`): replaces an existing admin's password.
   * Returns false if no admin has that email.
   */
  async setPasswordHash(email: string, passwordHash: string): Promise<boolean> {
    await connectToDatabase();
    const result = await AdminUserModel.updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { passwordHash } },
    );
    return result.matchedCount === 1;
  },

  /**
   * Seed helper. Creates the admin only if the email is not taken; never
   * overwrites an existing account's password.
   */
  async createIfMissing(input: {
    email: string;
    passwordHash: string;
    role: AdminRole;
  }): Promise<{ created: boolean }> {
    await connectToDatabase();
    const email = input.email.trim().toLowerCase();
    const result = await AdminUserModel.updateOne(
      { email },
      { $setOnInsert: { email, passwordHash: input.passwordHash, role: input.role } },
      { upsert: true },
    );
    return { created: result.upsertedCount > 0 };
  },
};
