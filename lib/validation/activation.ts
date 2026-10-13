import { z } from 'zod';
import { nameSchema, requiredPhoneSchema } from './auth';
import { VEHICLE_FIELD_LIMITS } from './vehicle';

/**
 * The activation screen: who the owner is and which car the sticker goes on.
 * The brand comes from a list, or from the « Autre » field when it is not on
 * it; the PIN is checked separately (lib/validation/pin.ts), since it needs the
 * phone to refuse « the end of my own number ».
 */
export const OTHER_BRAND = 'other';

const carText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(min, 'required').max(max, 'too_long'));

export const carSchema = z.object({
  brand: carText(VEHICLE_FIELD_LIMITS.brand.min, VEHICLE_FIELD_LIMITS.brand.max),
  model: carText(VEHICLE_FIELD_LIMITS.model.min, VEHICLE_FIELD_LIMITS.model.max),
});

export const activationDetailsSchema = carSchema.extend({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: requiredPhoneSchema,
});

export type ActivationField = keyof z.infer<typeof activationDetailsSchema> | 'pin' | 'pinConfirm' | 'code';

/** The brand as chosen: the list's value, or what was typed under « Autre ». */
export function chosenBrand(selected: FormDataEntryValue | null, other: FormDataEntryValue | null): string {
  const value = String(selected ?? '');
  return value === OTHER_BRAND ? String(other ?? '') : value;
}
