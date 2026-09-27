import type { TagStatus } from '@/lib/domain/constants';

/**
 * Which admin corrections a sticker allows. Plain logic, shared by the table
 * (which buttons to show) and the repository (which rows the query may touch).
 */

/** Never used — no car, no messages — and not promised to an order. Only these can be deleted. */
export function canDeleteTag(tag: { status: TagStatus; onOrder: boolean }): boolean {
  return tag.status === 'UNASSIGNED' && !tag.onOrder;
}

/** A sticker a customer holds, whatever its state, can be taken back. */
export function canTakeBackTag(tag: { hasOwner: boolean }): boolean {
  return tag.hasOwner;
}
