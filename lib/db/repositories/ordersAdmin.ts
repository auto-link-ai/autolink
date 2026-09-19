/**
 * Repository: orders — admin side
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor`; every mutation writes its audit entry in the same transaction.
 * Status changes follow lib/orders/transitions.ts, with the allowed "from"
 * statuses in the update filter so concurrent changes cannot skip the table.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { OrderModel } from '@/lib/db/models/order';
import { TagModel } from '@/lib/db/models/tag';
import { ORDER_STATUSES, type OrderAction, type OrderStatus } from '@/lib/domain/constants';
import { canApplyOrderAction, canAssignTags, orderAllowedFrom, orderTargetStatus } from '@/lib/orders/transitions';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';
import { ORDER_DTO_FIELDS, toOrderDTO, type OrderDTO } from './orders';

export interface AdminOrderDTO extends OrderDTO {
  assignedTagIds: string[];
  courier: string | null;
  trackingNumber: string | null;
  updatedAt: Date;
}

export interface AdminOrderPage {
  items: OrderDTO[];
  total: number;
  page: number;
  pageCount: number;
}

export interface AdminOrderFilter {
  status?: OrderStatus;
  orderRef?: string;
  phone?: string;
}

export type OrderActionResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_allowed' | 'conflict' | 'tags_missing' };

export type AssignTagsResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'not_allowed' | 'wrong_count' | 'conflict' }
  | { ok: false; reason: 'unavailable'; tagIds: string[] };

export const ADMIN_ORDER_PAGE_SIZE = 25;

class AssignConflict extends Error {}

function toQuery(filter: AdminOrderFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.orderRef) query.orderRef = filter.orderRef;
  if (filter.phone) query.phone = filter.phone;
  return query;
}

async function publicTagIds(ids: unknown[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const tags = await TagModel.find({ _id: { $in: ids } }, { _id: 0, publicTagId: 1 }).lean();
  return tags.map((t) => t.publicTagId).sort();
}

export const adminOrdersRepository = {
  async countByStatus(_admin: AdminActor): Promise<Record<OrderStatus, number>> {
    await connectToDatabase();
    const rows = await OrderModel.aggregate<{ _id: OrderStatus; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    for (const row of rows) counts[row._id] = row.n;
    return counts;
  },

  async list(_admin: AdminActor, filter: AdminOrderFilter, page: number): Promise<AdminOrderPage> {
    await connectToDatabase();
    const query = toQuery(filter);
    const total = await OrderModel.countDocuments(query);
    const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pageCount);
    const docs = await OrderModel.find(query, ORDER_DTO_FIELDS)
      .sort({ createdAt: -1 })
      .skip((current - 1) * ADMIN_ORDER_PAGE_SIZE)
      .limit(ADMIN_ORDER_PAGE_SIZE)
      .lean();
    return { items: docs.map(toOrderDTO), total, page: current, pageCount };
  },

  async get(_admin: AdminActor, orderRef: string): Promise<AdminOrderDTO | null> {
    await connectToDatabase();
    const doc = await OrderModel.findOne({ orderRef }).lean();
    if (!doc) return null;
    return {
      ...toOrderDTO(doc),
      assignedTagIds: await publicTagIds(doc.assignedTagIds),
      courier: doc.courier,
      trackingNumber: doc.trackingNumber,
      updatedAt: doc.updatedAt,
    };
  },

  /** Status workflow. Shipping needs all tags assigned; cancelling releases them. */
  async transition(admin: AdminActor, orderRef: string, action: OrderAction): Promise<OrderActionResult> {
    const mongoose = await connectToDatabase();
    const order = await OrderModel.findOne({ orderRef }, { status: 1, quantity: 1, assignedTagIds: 1 }).lean();
    if (!order) return { ok: false, reason: 'not_found' };
    if (!canApplyOrderAction(action, order.status)) return { ok: false, reason: 'not_allowed' };
    if (action === 'ship' && order.assignedTagIds.length !== order.quantity) {
      return { ok: false, reason: 'tags_missing' };
    }

    const from = order.status;
    const to = orderTargetStatus(action);
    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const set: Record<string, unknown> = { status: to };
      if (action === 'cancel') set.assignedTagIds = [];
      const result = await OrderModel.updateOne(
        { _id: order._id, status: { $in: orderAllowedFrom(action) } },
        { $set: set },
        { session },
      );
      applied = result.modifiedCount === 1;
      if (!applied) return;
      if (action === 'cancel') {
        await TagModel.updateMany({ orderId: order._id }, { $set: { orderId: null } }, { session });
      }
      await auditLogsRepository.append(
        admin,
        { action: 'ORDER_STATUS_CHANGE', targetType: 'order', targetId: orderRef, metadata: { action, from, to } },
        session,
      );
    });
    return applied ? { ok: true } : { ok: false, reason: 'conflict' };
  },

  /**
   * Links exactly `quantity` tags to the order at packing time. Tags must be
   * UNASSIGNED and not linked to another order; this order's previous
   * assignment is released first. Tags stay UNASSIGNED until the buyer activates.
   */
  async assignTags(admin: AdminActor, orderRef: string, tagIds: string[]): Promise<AssignTagsResult> {
    const mongoose = await connectToDatabase();
    const order = await OrderModel.findOne({ orderRef }, { status: 1, quantity: 1 }).lean();
    if (!order) return { ok: false, reason: 'not_found' };
    if (!canAssignTags(order.status)) return { ok: false, reason: 'not_allowed' };
    const ids = [...new Set(tagIds)];
    if (ids.length !== order.quantity) return { ok: false, reason: 'wrong_count' };

    const available = await TagModel.find(
      { publicTagId: { $in: ids }, status: 'UNASSIGNED', $or: [{ orderId: null }, { orderId: order._id }] },
      { _id: 1, publicTagId: 1 },
    ).lean();
    if (available.length !== ids.length) {
      const found = new Set(available.map((t) => t.publicTagId));
      return { ok: false, reason: 'unavailable', tagIds: ids.filter((id) => !found.has(id)) };
    }

    try {
      await mongoose.connection.transaction(async (session) => {
        await TagModel.updateMany({ orderId: order._id }, { $set: { orderId: null } }, { session });
        const linked = await TagModel.updateMany(
          { _id: { $in: available.map((t) => t._id) }, status: 'UNASSIGNED', orderId: null },
          { $set: { orderId: order._id } },
          { session },
        );
        if (linked.modifiedCount !== ids.length) throw new AssignConflict();
        const updated = await OrderModel.updateOne(
          { _id: order._id, status: order.status },
          { $set: { assignedTagIds: available.map((t) => t._id) } },
          { session },
        );
        if (updated.matchedCount !== 1) throw new AssignConflict();
        await auditLogsRepository.append(
          admin,
          { action: 'ORDER_TAGS_ASSIGN', targetType: 'order', targetId: orderRef, metadata: { tagIds: ids } },
          session,
        );
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof AssignConflict) return { ok: false, reason: 'conflict' };
      throw error;
    }
  },

  async updateShipping(
    admin: AdminActor,
    orderRef: string,
    shipping: { courier: string | null; trackingNumber: string | null },
  ): Promise<{ ok: boolean }> {
    const mongoose = await connectToDatabase();
    let ok = false;
    await mongoose.connection.transaction(async (session) => {
      const result = await OrderModel.updateOne({ orderRef }, { $set: shipping }, { session });
      ok = result.matchedCount === 1;
      if (!ok) return;
      await auditLogsRepository.append(
        admin,
        { action: 'ORDER_SHIPPING_UPDATE', targetType: 'order', targetId: orderRef, metadata: shipping },
        session,
      );
    });
    return { ok };
  },

  /** CSV export: every matching order, newest first. */
  async *export(_admin: AdminActor, filter: AdminOrderFilter): AsyncGenerator<AdminOrderDTO> {
    await connectToDatabase();
    const cursor = OrderModel.find(toQuery(filter)).sort({ createdAt: -1 }).lean().cursor();
    for await (const doc of cursor) {
      yield {
        ...toOrderDTO(doc),
        assignedTagIds: await publicTagIds(doc.assignedTagIds),
        courier: doc.courier,
        trackingNumber: doc.trackingNumber,
        updatedAt: doc.updatedAt,
      };
    }
  },
};
