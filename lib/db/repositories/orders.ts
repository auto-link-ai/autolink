/**
 * Repository: orders — public side (guest checkout, cash on delivery)
 *
 * SECURITY BOUNDARY — only repositories import models.
 * - Creation is public. Prices arrive already computed on the server from
 *   settings (lib/orders/placeOrder.ts), never from request input.
 * - `findByRef` serves the confirmation page, which shows personal data only to
 *   the browser holding the order's view cookie.
 * - Everything admin (list, workflow, tags, export) lives in ./ordersAdmin.ts
 *   and takes an `AdminActor`.
 * Returned objects never include `_id`; orders are identified by `orderRef`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { OrderModel, type Order } from '@/lib/db/models/order';
import type { DeliveryType, OrderStatus } from '@/lib/domain/constants';

export interface OrderDTO {
  orderRef: string;
  customerName: string;
  phone: string;
  email: string | null;
  wilayaCode: number;
  commune: string;
  address: string;
  deliveryType: DeliveryType;
  deliveryNotes: string | null;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
}

export type NewOrder = Omit<OrderDTO, 'orderRef' | 'status' | 'createdAt'>;

/** Projection for OrderDTO (shared with ./ordersAdmin.ts). */
export const ORDER_DTO_FIELDS = {
  _id: 0,
  orderRef: 1,
  customerName: 1,
  phone: 1,
  email: 1,
  wilayaCode: 1,
  commune: 1,
  address: 1,
  deliveryType: 1,
  deliveryNotes: 1,
  quantity: 1,
  unitPrice: 1,
  deliveryFee: 1,
  totalPrice: 1,
  status: 1,
  createdAt: 1,
} as const;

export function toOrderDTO(doc: Pick<Order, keyof OrderDTO>): OrderDTO {
  return {
    orderRef: doc.orderRef,
    customerName: doc.customerName,
    phone: doc.phone,
    email: doc.email,
    wilayaCode: doc.wilayaCode,
    commune: doc.commune,
    address: doc.address,
    deliveryType: doc.deliveryType,
    deliveryNotes: doc.deliveryNotes,
    quantity: doc.quantity,
    unitPrice: doc.unitPrice,
    deliveryFee: doc.deliveryFee,
    totalPrice: doc.totalPrice,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export const ordersRepository = {
  /** Returns `{ created: false }` on an orderRef collision so the caller can retry. */
  async create(orderRef: string, order: NewOrder): Promise<{ created: boolean }> {
    await connectToDatabase();
    try {
      await OrderModel.create({ ...order, orderRef, status: 'PENDING' });
      return { created: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { created: false };
      throw error;
    }
  },

  /** Confirmation page. The page decides how much of this to show (view cookie). */
  async findByRef(orderRef: string): Promise<OrderDTO | null> {
    await connectToDatabase();
    const doc = await OrderModel.findOne({ orderRef }, ORDER_DTO_FIELDS).lean();
    return doc ? toOrderDTO(doc) : null;
  },
};
