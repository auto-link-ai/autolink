import { z } from 'zod';
import { locales } from '@/i18n/locales';
import { dzPhoneSchema } from './phone';

/**
 * Customer accounts. Error messages are stable codes the forms map to
 * translated copy, the same convention as lib/validation/order.ts.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'password_too_short')
  .max(PASSWORD_MAX_LENGTH, 'too_long');

export const emailSchema = z
  .string()
  .trim()
  .max(254, 'too_long')
  .transform((value) => value.toLowerCase())
  .pipe(z.email('invalid_email'));

export const nameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'too_short').max(80, 'too_long'));

/** Optional: many customers order by phone, but it is not the identity. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null;
    const parsed = dzPhoneSchema.safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
      return z.NEVER;
    }
    return parsed.data;
  });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  password: passwordSchema,
  locale: z.enum(locales).catch('fr'),
});

/**
 * An owner changing their own password. No "type it again" field: the new one
 * can be shown on screen, which catches typos better than typing it twice.
 */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'required').max(PASSWORD_MAX_LENGTH, 'too_long'),
    next: passwordSchema,
  })
  .refine((value) => value.next !== value.current, { path: ['next'], message: 'same_password' });

export type ChangePasswordField = keyof z.infer<typeof changePasswordSchema>;

/** What an admin may correct on a customer's account. Never the email. */
export const customerContactSchema = z.object({
  name: nameSchema,
  phone: optionalPhoneSchema,
});

export type CustomerContactInput = z.infer<typeof customerContactSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterField = keyof RegisterInput;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'required').max(PASSWORD_MAX_LENGTH, 'too_long'),
});

/** First error code per field, for the forms. */
export function fieldErrors<T extends string>(error: z.ZodError): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as T | undefined;
    if (field && !out[field]) out[field] = issue.message;
  }
  return out;
}
