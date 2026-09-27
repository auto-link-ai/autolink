/**
 * Repository: orders — admin corrections (edit, add by hand, delete)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor`; every change writes its audit entry in the same transaction.
 * The audit log records which fields changed, never the customer's details.
 * Which statuses allow what lives in lib/orders/transitions.ts.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { OrderModel } from '@/lib/db/models/order';
import { TagModel } from '@/lib/db/models/tag';
import { generateOrderRef } from '@/lib/orders/ref';
import { computeOrderTotals, type FeeRow } from '@/lib/orders/totals';
import { canDeleteOrder, canEditOrder } from '@/lib/orders/transitions';
import type { OrderInput } from '@/lib/validation/order';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';

export type OrderEditResult = { ok: true } | { ok: false; reason: 'not_found' | 'not_allowed' | 'no_delivery' | 'conflict' };
export type OrderCreateResult = { ok: true; orderRef: string } | { ok: false; reason: 'no_delivery' };

const EDITABLE_FIELDS = [
  'customerName',
  'phone',
  'email',
  'wilayaCode',
  'commune',
  'address',
  'deliveryType',
  'deliveryNotes',
  'quantity',
] as const;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export const adminOrderEditsRepository = {
  /**
   * Corrects an order until it ships. The unit price stays what was agreed; the
   * delivery fee and total follow today's fee for the (possibly new) wilaya and
   * delivery type. A new quantity releases the stickers already assigned.
   */
  async update(
    admin: AdminActor,
    orderRef: string,
    input: OrderInput,
    deliveryFees: readonly FeeRow[],
  ): Promise<OrderEditResult> {
    const mongoose = await connectToDatabase();
    const order = await OrderModel.findOne({ orderRef }).lean();
    if (!order) return { ok: false, reason: 'not_found' };
    if (!canEditOrder(order.status)) return { ok: false, reason: 'not_allowed' };

    const totals = computeOrderTotals(input, { unitPrice: order.unitPrice, deliveryFees });
    if (!totals) return { ok: false, reason: 'no_delivery' };
    const changed = EDITABLE_FIELDS.filter((field) => order[field] !== input[field]);
    const releaseTags = input.quantity !== order.quantity && order.assignedTagIds.length > 0;

    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const set: Record<string, unknown> = { ...input, deliveryFee: totals.deliveryFee, totalPrice: totals.totalPrice };
      if (releaseTags) set.assignedTagIds = [];
      const result = await OrderModel.updateOne(
        { _id: order._id, status: order.status },
        { $set: set },
        { session, runValidators: true },
      );
      applied = result.matchedCount === 1;
      if (!applied) return;
      if (releaseTags) await TagModel.updateMany({ orderId: order._id }, { $set: { orderId: null } }, { session });
      await auditLogsRepository.append(
        admin,
        { action: 'ORDER_EDIT', targetType: 'order', targetId: orderRef, metadata: { fields: changed, releasedTags: releaseTags } },
        session,
      );
    });
    return applied ? { ok: true } : { ok: false, reason: 'conflict' };
  },

  /** An order taken by phone: the same checks and prices as the website, saved « En attente ». */
  async createManual(
    admin: AdminActor,
    input: OrderInput,
    pricing: { unitPrice: number; deliveryFees: readonly FeeRow[] },
  ): Promise<OrderCreateResult> {
    const totals = computeOrderTotals(input, pricing);
    if (!totals) return { ok: false, reason: 'no_delivery' };
    const mongoose = await connectToDatabase();

    for (let attempt = 0; attempt < 5; attempt++) {
      const orderRef = generateOrderRef();
      try {
        await mongoose.connection.transaction(async (session) => {
          await OrderModel.create([{ ...input, ...totals, orderRef, status: 'PENDING' }], { session });
          await auditLogsRepository.append(
            admin,
            { action: 'ORDER_CREATE_MANUAL', targetType: 'order', targetId: orderRef, metadata: { quantity: input.quantity } },
            session,
          );
        });
        return { ok: true, orderRef };
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    throw new Error('Could not allocate a unique order reference.');
  },

  /** Deletes a new or cancelled order for good, releasing any sticker still linked to it. */
  async remove(admin: AdminActor, orderRef: string): Promise<OrderEditResult> {
    const mongoose = await connectToDatabase();
    const order = await OrderModel.findOne({ orderRef }, { _id: 1, status: 1 }).lean();
    if (!order) return { ok: false, reason: 'not_found' };
    if (!canDeleteOrder(order.status)) return { ok: false, reason: 'not_allowed' };

    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const result = await OrderModel.deleteOne({ _id: order._id, status: order.status }, { session });
      applied = result.deletedCount === 1;
      if (!applied) return;
      await TagModel.updateMany({ orderId: order._id }, { $set: { orderId: null } }, { session });
      await auditLogsRepository.append(
        admin,
        { action: 'ORDER_DELETE', targetType: 'order', targetId: orderRef, metadata: { status: order.status } },
        session,
      );
    });
    return applied ? { ok: true } : { ok: false, reason: 'conflict' };
  },
};
