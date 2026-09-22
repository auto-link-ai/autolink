import type { OrderField } from '@/lib/validation/order';

/**
 * Ordering, one step at a time. Each step names the fields it asks for, so a
 * step only ever checks — and only ever hides — its own fields. The last step
 * asks for nothing: it shows what was typed and sends it.
 */
export const ORDER_STEPS = [
  { id: 'quantity', fields: ['quantity'] },
  { id: 'contact', fields: ['customerName', 'phone', 'email'] },
  { id: 'delivery', fields: ['wilayaCode', 'commune', 'address', 'deliveryType', 'deliveryNotes'] },
  { id: 'review', fields: [] },
] as const satisfies readonly { id: string; fields: readonly OrderField[] }[];

export type OrderStepId = (typeof ORDER_STEPS)[number]['id'];

export const REVIEW_STEP = ORDER_STEPS.length - 1;

/** Every field a step asks for, as plain strings. */
export function fieldsOfStep(step: number): readonly string[] {
  return ORDER_STEPS[step]?.fields ?? [];
}

/** The first step that asks for one of these fields — where an error belongs. */
export function stepWithField(fields: Iterable<string>): number | null {
  const wanted = new Set(fields);
  const index = ORDER_STEPS.findIndex((step) => step.fields.some((field) => wanted.has(field)));
  return index === -1 ? null : index;
}
