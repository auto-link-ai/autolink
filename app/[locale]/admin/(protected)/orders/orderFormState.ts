import type { OrderField } from '@/lib/validation/order';

/** What the admin order form gets back when a save is refused. */
export interface OrderFormState {
  status: 'idle' | 'error';
  fieldErrors?: Partial<Record<OrderField, string>>;
  formError?: 'no_delivery' | 'not_allowed' | 'not_found' | 'conflict';
}

export const ORDER_FORM_INITIAL: OrderFormState = { status: 'idle' };

/** The form's field names, in the order the form shows them. */
export const ORDER_FORM_FIELDS: readonly OrderField[] = [
  'customerName',
  'phone',
  'email',
  'wilayaCode',
  'commune',
  'address',
  'deliveryType',
  'deliveryNotes',
  'quantity',
];
