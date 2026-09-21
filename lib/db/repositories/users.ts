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
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import type { UserStatus } from '@/lib/domain/constants';
import { generatePublicUserId } from '@/lib/tags/generate';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { AdminActor, OwnerActor } from './actor';
import { auditLogsRepository } from './auditLogs';
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

/** One account as the admin list shows it. */
export interface AdminCustomerRow {
  publicUserId: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
  stickerCount: number;
}

export interface AdminCustomerPage {
  items: AdminCustomerRow[];
  total: number;
  page: number;
  pageCount: number;
}

export interface AdminCustomerFilter {
  /** Email fragment as typed. */
  email?: string;
  /** Normalized phone, exact match. */
  phone?: string;
  status?: UserStatus;
}

export interface CustomerSummary {
  total: number;
  active: number;
  blocked: number;
  newLast7Days: number;
}

export const ADMIN_CUSTOMER_PAGE_SIZE = 25;

/** A regex over an email fragment; the input is escaped, never interpolated raw. */
function emailFilter(fragment: string): RegExp {
  return new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export const usersRepository = {
  /** Registration. Returns `{ created: false }` when the email is already taken. */
  async create(user: NewUser): Promise<{ created: boolean; id?: string }> {
    await connectToDatabase();
    try {
      const doc = await UserModel.create({ ...user, publicUserId: generatePublicUserId() });
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

  /**
   * The owner's own password hash, so the change-password action can verify
   * the current password. Owner-scoped: this is the only read of the hash
   * besides `findForLogin`, and it can only return the caller's own.
   */
  async passwordHashFor(owner: OwnerActor): Promise<string | null> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return null;
    await connectToDatabase();
    const doc = await UserModel.findById(objectId).select('+passwordHash').lean();
    return doc?.passwordHash ?? null;
  },

  /** The owner replacing their own password, after proving the current one. */
  async setOwnPasswordHash(owner: OwnerActor, passwordHash: string): Promise<{ ok: boolean }> {
    const objectId = toObjectId(owner.userId);
    if (!objectId) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ _id: objectId }, { $set: { passwordHash } });
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

  // ---- Admin side ---------------------------------------------------------------------
  // Support, not ownership: these take an AdminActor and address an account by its
  // publicUserId. Every change writes an audit entry, so "who blocked this customer?"
  // has an answer.

  /** The numbers on the admin overview. */
  async countSummary(_admin: AdminActor): Promise<CustomerSummary> {
    await connectToDatabase();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, blocked, newLast7Days] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ status: 'BLOCKED' }),
      UserModel.countDocuments({ createdAt: { $gte: weekAgo } }),
    ]);
    return { total, active: total - blocked, blocked, newLast7Days };
  },

  async listForAdmin(
    _admin: AdminActor,
    filter: AdminCustomerFilter,
    page: number,
  ): Promise<AdminCustomerPage> {
    await connectToDatabase();
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.phone) match.phone = filter.phone;
    if (filter.email) match.email = emailFilter(filter.email);

    const total = await UserModel.countDocuments(match);
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_CUSTOMER_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pageCount);

    const items = await UserModel.aggregate<AdminCustomerRow>([
      { $match: match },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: (current - 1) * ADMIN_CUSTOMER_PAGE_SIZE },
      { $limit: ADMIN_CUSTOMER_PAGE_SIZE },
      {
        $lookup: {
          from: 'tags',
          localField: '_id',
          foreignField: 'ownerId',
          as: 'stickers',
          pipeline: [{ $project: { _id: 1 } }],
        },
      },
      {
        $project: {
          _id: 0,
          // Empty until `pnpm backfill:user-ids` has run over older accounts;
          // the list stays readable, the account just cannot be opened yet.
          publicUserId: { $ifNull: ['$publicUserId', ''] },
          email: 1,
          name: { $ifNull: ['$name', null] },
          phone: { $ifNull: ['$phone', null] },
          status: 1,
          createdAt: 1,
          lastLoginAt: { $ifNull: ['$lastLoginAt', null] },
          stickerCount: { $size: '$stickers' },
        },
      },
    ]);

    return { items, total, page: current, pageCount };
  },

  /** One account, addressed the way the admin URL addresses it. */
  async getForAdmin(_admin: AdminActor, publicUserId: string): Promise<AdminCustomerRow | null> {
    if (!isValidPublicUserId(publicUserId)) return null;
    await connectToDatabase();
    const doc = await UserModel.findOne({ publicUserId }).lean();
    if (!doc) return null;
    const stickerCount = await TagModel.countDocuments({ ownerId: doc._id });
    return {
      publicUserId: doc.publicUserId,
      email: doc.email,
      name: doc.name ?? null,
      phone: doc.phone ?? null,
      status: doc.status,
      createdAt: doc.createdAt,
      lastLoginAt: doc.lastLoginAt,
      stickerCount,
    };
  },

  /**
   * Blocks or unblocks an account. A blocked customer cannot sign in, and an
   * existing session stops working on its next request — `getOwnerSession`
   * re-reads the account every time.
   */
  async setStatus(admin: AdminActor, publicUserId: string, status: UserStatus): Promise<{ ok: boolean }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ publicUserId }, { $set: { status } });
    if (result.matchedCount !== 1) return { ok: false };
    await auditLogsRepository.append(admin, {
      action: status === 'BLOCKED' ? 'USER_BLOCK' : 'USER_UNBLOCK',
      targetType: 'user',
      targetId: publicUserId,
    });
    return { ok: true };
  },

  /** Support fixing a mistyped name or phone. The email is identity: not editable. */
  async updateContact(
    admin: AdminActor,
    publicUserId: string,
    patch: { name: string | null; phone: string | null },
  ): Promise<{ ok: boolean }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ publicUserId }, { $set: patch }, { runValidators: true });
    if (result.matchedCount !== 1) return { ok: false };
    await auditLogsRepository.append(admin, {
      action: 'USER_CONTACT_UPDATE',
      targetType: 'user',
      targetId: publicUserId,
      // The values themselves stay out of the log; the account already holds them.
      metadata: { fields: Object.keys(patch) },
    });
    return { ok: true };
  },

  /** Admin-issued password reset. The plaintext is shown once and never stored. */
  async setPasswordHashById(
    admin: AdminActor,
    publicUserId: string,
    passwordHash: string,
  ): Promise<{ ok: boolean }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ publicUserId }, { $set: { passwordHash } });
    if (result.matchedCount !== 1) return { ok: false };
    await auditLogsRepository.append(admin, {
      action: 'USER_PASSWORD_RESET',
      targetType: 'user',
      targetId: publicUserId,
    });
    return { ok: true };
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
