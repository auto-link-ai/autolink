/**
 * Repository: orders (guest checkout, cash on delivery)
 *
 * SECURITY BOUNDARY — only repositories import models.
 * - Creation is public (guest checkout); price and delivery fee are read from
 *   settings and snapshotted here, never taken from request input.
 * - The confirmation page may read an order only by its `orderRef`, and gets
 *   only what the customer entered.
 * - Listing, status changes and tag assignment require an `AdminActor`.
 * Returned objects never include `_id`; orders are identified by `orderRef`.
 *
 * Functions are added in Phase 6 (orders & COD).
 */
import 'server-only';
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
