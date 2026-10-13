import { z } from 'zod';
import { dzPhoneSchema } from './phone';
import { pinSchema } from './pin';

/**
 * Accounts. Error messages are stable codes the forms map to translated copy,
 * the same convention as lib/validation/order.ts. Owners sign in with their
 * phone and a PIN (lib/validation/pin.ts); admins still use a password.
 */

/** Admin passwords (scripts/admin-create.ts). */
export const PASSWORD_MIN_LENGTH = 10;

/** A first name or a last name, spaces tidied. */
export const nameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'too_short').max(40, 'too_long'));

/**
 * The owner's WhatsApp number: their sign-in and where their alerts go.
 * Empty says « required », anything else must be an Algerian mobile.
 */
export const requiredPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') {
      ctx.addIssue({ code: 'custom', message: 'required' });
      return z.NEVER;
    }
    const parsed = dzPhoneSchema.safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return z.NEVER;
    }
    return parsed.data;
  });

export const pinLoginSchema = z.object({ phone: requiredPhoneSchema, pin: pinSchema });
export type PinLoginField = keyof z.infer<typeof pinLoginSchema>;

/** What an admin may correct on a customer's account. */
export const customerContactSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: requiredPhoneSchema,
});

export type CustomerContactInput = z.infer<typeof customerContactSchema>;

/** First error code per field, for the forms. */
export function fieldErrors<T extends string>(error: z.ZodError): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as T | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}
