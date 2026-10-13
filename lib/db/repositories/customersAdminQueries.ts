/**
 * Repository: customer accounts — what the admin reads
 *
 * SECURITY BOUNDARY — only repositories import models. Support, not ownership:
 * every function takes an `AdminActor` and addresses accounts by publicUserId.
 * Never returns `_id` or the PIN hash. Changes are in customersAdmin.ts.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import type { UserStatus } from '@/lib/domain/constants';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { AdminActor } from './actor';

/** One account as the admin list shows it. */
export interface AdminCustomerRow {
  publicUserId: string;
  firstName: string;
  lastName: string;
  phone: string;
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
  /** Normalized phone, exact match. */
  phone?: string;
  /** A first or last name fragment, as typed. */
  name?: string;
  status?: UserStatus;
}

export interface CustomerSummary {
  total: number;
  active: number;
  blocked: number;
  newLast7Days: number;
}

export const ADMIN_CUSTOMER_PAGE_SIZE = 25;

/** A regex over a name fragment; the input is escaped, never interpolated raw. */
function fragment(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function toRow(doc: {
  publicUserId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone: string;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt?: Date | null;
}, stickerCount: number): AdminCustomerRow {
  return {
    // Empty until `pnpm backfill:user-ids` has run over older accounts;
    // the list stays readable, the account just cannot be opened yet.
    publicUserId: doc.publicUserId ?? '',
    firstName: doc.firstName ?? '',
    lastName: doc.lastName ?? '',
    phone: doc.phone,
    status: doc.status,
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt ?? null,
    stickerCount,
  };
}

export const adminCustomersQueries = {
  /** The numbers on the admin overview and the customers page. */
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

  async listForAdmin(_admin: AdminActor, filter: AdminCustomerFilter, page: number): Promise<AdminCustomerPage> {
    await connectToDatabase();
    const match: Record<string, unknown> = {};
    if (filter.status) match.status = filter.status;
    if (filter.phone) match.phone = filter.phone;
    if (filter.name) match.$or = [{ firstName: fragment(filter.name) }, { lastName: fragment(filter.name) }];

    const total = await UserModel.countDocuments(match);
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_CUSTOMER_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pageCount);

    const docs = await UserModel.find(match, {
      publicUserId: 1,
      firstName: 1,
      lastName: 1,
      phone: 1,
      status: 1,
      createdAt: 1,
      lastLoginAt: 1,
    })
      .sort({ createdAt: -1, _id: 1 })
      .skip((current - 1) * ADMIN_CUSTOMER_PAGE_SIZE)
      .limit(ADMIN_CUSTOMER_PAGE_SIZE)
      .lean();

    // One count query for the page, not one per row.
    const counts = await TagModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { ownerId: { $in: docs.map((doc) => doc._id) } } },
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
    ]);
    const byOwner = new Map(counts.map((entry) => [String(entry._id), entry.count]));
    const items = docs.map((doc) => toRow(doc, byOwner.get(doc._id.toString()) ?? 0));
    return { items, total, page: current, pageCount };
  },

  /** One account, addressed the way the admin URL addresses it. */
  async getForAdmin(_admin: AdminActor, publicUserId: string): Promise<AdminCustomerRow | null> {
    if (!isValidPublicUserId(publicUserId)) return null;
    await connectToDatabase();
    const doc = await UserModel.findOne({ publicUserId }).lean();
    if (!doc) return null;
    return toRow(doc, await TagModel.countDocuments({ ownerId: doc._id }));
  },
};
