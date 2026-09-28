import type { OrderField } from '@/lib/validation/order';

/**
 * The order form's fields, top to bottom as the page shows them — so a refused
 * form always sends the cursor to the first thing to fix, never to one further
 * down while an earlier one is still wrong.
 */
export const FIELD_ORDER = [
  'quantity',
  'customerName',
  'phone',
  'wilayaCode',
  'commune',
  'address',
  'deliveryType',
  'email',
  'deliveryNotes',
] as const satisfies readonly OrderField[];

/** Optional, behind « Ajouter un e-mail ou une note »: opened when one is refused. */
export const TUCKED_AWAY: ReadonlySet<string> = new Set<OrderField>(['email', 'deliveryNotes']);

/** The first refused field in page order, or null when none of ours is. */
export function firstFieldToFix(errors: Partial<Record<string, string>>): OrderField | null {
  return FIELD_ORDER.find((field) => errors[field]) ?? null;
}

/** How many stickers get a card of their own: 1, 2 and 3 cars. */
const CARDS = [1, 2, 3] as const;

/** The quantity cards, never past the order maximum from settings. */
export function quantityCards(maxQuantity: number): number[] {
  return CARDS.filter((count) => count <= maxQuantity);
}

/** A « Plus » card with − / + appears only when more than the cards is allowed. */
export function allowsMore(maxQuantity: number): boolean {
  return maxQuantity > CARDS.length;
}

/** Keeps a quantity between 1 and the maximum. */
export function clampQuantity(value: number, maxQuantity: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(1, Math.trunc(value)), Math.max(1, maxQuantity));
}
