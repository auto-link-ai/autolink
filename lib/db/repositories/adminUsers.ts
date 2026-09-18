/**
 * Repository: adminUsers
 *
 * SECURITY BOUNDARY — only repositories import models. Admin accounts are
 * separate from owner accounts (separate collection, session, and login page).
 * The password hash is `select: false` and is only read by the admin login
 * path (Phase 1). Returned objects never include `_id` or `passwordHash`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { AdminUserModel } from '@/lib/db/models/adminUser';
import type { AdminRole } from '@/lib/domain/constants';

export interface AdminUserDTO {
  email: string;
  role: AdminRole;
  lastLoginAt: Date | null;
}

export const adminUsersRepository = {
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
    const result = await AdminUserModel.updateOne(
      { email: input.email.toLowerCase() },
      { $setOnInsert: { email: input.email.toLowerCase(), passwordHash: input.passwordHash, role: input.role } },
      { upsert: true },
    );
    return { created: result.upsertedCount > 0 };
  },
};
