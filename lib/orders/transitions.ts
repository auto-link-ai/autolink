import { ORDER_ACTIONS, type OrderAction, type OrderStatus } from '@/lib/domain/constants';

/**
 * Admin order workflow. Each action lists the statuses it may start from; the
 * repository puts that list in its update filter, so a concurrent change can
 * never skip this table.
 */
const RULES: Readonly<Record<OrderAction, { from: readonly OrderStatus[]; to: OrderStatus }>> = {
  confirm: { from: ['PENDING'], to: 'CONFIRMED' },
  prepare: { from: ['CONFIRMED'], to: 'PREPARING' },
  ship: { from: ['PREPARING'], to: 'SHIPPED' },
  deliver: { from: ['SHIPPED'], to: 'DELIVERED' },
  cancel: { from: ['PENDING', 'CONFIRMED', 'PREPARING'], to: 'CANCELLED' },
};

export function orderAllowedFrom(action: OrderAction): readonly OrderStatus[] {
  return RULES[action].from;
}

export function orderTargetStatus(action: OrderAction): OrderStatus {
  return RULES[action].to;
}

export function canApplyOrderAction(action: OrderAction, status: OrderStatus): boolean {
  return RULES[action].from.includes(status);
}

export function availableOrderActions(status: OrderStatus): OrderAction[] {
  return ORDER_ACTIONS.filter((action) => canApplyOrderAction(action, status));
}

/** Tags can be assigned or changed while the order is being confirmed or packed. */
export function canAssignTags(status: OrderStatus): boolean {
  return status === 'CONFIRMED' || status === 'PREPARING';
}

/** An order's details can be corrected until the parcel leaves. */
export function canEditOrder(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED' || status === 'PREPARING';
}

/**
 * Only an order that never went anywhere can be deleted: a new one (a mistake,
 * a duplicate, a prank) or a cancelled one. A confirmed order is cancelled first.
 */
export function canDeleteOrder(status: OrderStatus): boolean {
  return status === 'PENDING' || status === 'CANCELLED';
}
