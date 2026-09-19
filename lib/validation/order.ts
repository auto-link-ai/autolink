import { z } from 'zod';
import {
  DELIVERY_TYPES,
  ORDER_FIELD_LIMITS as L,
  STORAGE_LIMITS,
  WILAYA_CODE_MAX,
  WILAYA_CODE_MIN,
} from '@/lib/domain/constants';
import { dzPhoneSchema } from './phone';

/**
 * Guest checkout input. Error messages are stable codes the form maps to
 * translated copy. `maxQuantity` comes from settings (rule 5).
 */
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ' '))
    .pipe(z.string().min(min, 'too_short').max(max, 'too_long'));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .transform((v) => (v === '' ? null : v));

export function orderInputSchema(maxQuantity: number) {
  const ceiling = Math.min(maxQuantity, STORAGE_LIMITS.orderQuantity);
  return z.object({
    quantity: z.coerce.number().int('invalid').min(1, 'too_small').max(ceiling, 'too_large'),
    customerName: text(L.name.min, L.name.max),
    phone: dzPhoneSchema,
    email: z
      .string()
      .trim()
      .max(L.email.max, 'too_long')
      .transform((v) => v.toLowerCase())
      .pipe(z.union([z.literal(''), z.email('invalid_email')]))
      .transform((v) => (v === '' ? null : v)),
    wilayaCode: z.coerce
      .number()
      .int('invalid')
      .min(WILAYA_CODE_MIN, 'required')
      .max(WILAYA_CODE_MAX, 'invalid'),
    commune: text(L.commune.min, L.commune.max),
    address: text(L.address.min, L.address.max),
    deliveryType: z.enum(DELIVERY_TYPES, 'required'),
    deliveryNotes: optionalText(L.notes.max),
  });
}

export type OrderInput = z.infer<ReturnType<typeof orderInputSchema>>;
export type OrderField = keyof OrderInput;

/** First error code per field, for the form. */
export function orderFieldErrors(error: z.ZodError): Partial<Record<OrderField, string>> {
  const out: Partial<Record<OrderField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as OrderField | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}
