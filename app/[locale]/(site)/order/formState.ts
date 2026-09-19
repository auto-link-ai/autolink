import type { OrderField } from '@/lib/validation/order';

/**
 * Shape returned by the order server action. It lives outside actions.ts
 * because a "use server" module may only export async functions.
 */
export interface OrderFormState {
  status: 'idle' | 'error';
  fieldErrors?: Partial<Record<OrderField, string>>;
  formError?: string;
}

export const ORDER_FORM_INITIAL: OrderFormState = { status: 'idle' };
