import { z } from 'zod';
import { CAR_FUELS, CARE_FIELD_LIMITS as L } from '@/lib/domain/constants';

/**
 * The car book's forms. Everything arrives as text from <input>s; empty means
 * "not filled in" and becomes null. Dates are calendar days, stored as UTC
 * midnight so a day never shifts with the viewer's time zone.
 */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LAST_YEAR = 2100;

/** 'YYYY-MM-DD' → UTC midnight, or null for anything that is not a real day. */
export function parseDay(value: string): Date | null {
  const match = DAY_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < L.firstYear || year > LAST_YEAR) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  // 2026-02-30 rolls over to March: not a real day.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/** The value an <input type="date"> expects back. */
export function toDayInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

const optionalDay = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === '') return null;
    const day = parseDay(value);
    if (!day) {
      ctx.addIssue({ code: 'custom', message: 'invalid_date' });
      return z.NEVER;
    }
    return day;
  });

const requiredDay = z
  .string()
  .trim()
  .min(1, 'required')
  .transform((value, ctx) => {
    const day = parseDay(value);
    if (!day) {
      ctx.addIssue({ code: 'custom', message: 'invalid_date' });
      return z.NEVER;
    }
    return day;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .transform((value) => (value === '' ? null : value.replace(/\s+/g, ' ')));

/** Whole numbers only; "85 000" is accepted as 85000. */
const optionalWhole = (max: number) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null;
      const number = Number(value.replace(/\s/g, ''));
      if (!Number.isInteger(number) || number < 0 || number > max) {
        ctx.addIssue({ code: 'custom', message: 'invalid_number' });
        return z.NEVER;
      }
      return number;
    });

/** "Next" dates may not come before the date they follow. */
function notBefore(later: Date | null, earlier: Date | null): boolean {
  return !later || !earlier || later.getTime() >= earlier.getTime();
}

export const profileSchema = z.object({
  year: optionalWhole(LAST_YEAR).refine(
    (year) => year === null || (year >= L.firstYear && year <= new Date().getUTCFullYear() + 1),
    'invalid_year',
  ),
  fuel: z.union([z.literal(''), z.enum(CAR_FUELS)]).transform((value) => (value === '' ? null : value)),
  engine: optionalText(L.engine),
  vin: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(new RegExp(`^([A-Z0-9]{${L.vin.min},${L.vin.max}})?$`), 'invalid_vin'))
    .transform((value) => (value === '' ? null : value)),
  registrationNumber: optionalText(L.registrationNumber),
});

export const oilChangeSchema = z
  .object({
    date: requiredDay,
    km: optionalWhole(L.km),
    oilType: optionalText(L.oilType),
    garage: optionalText(L.garage),
    costDzd: optionalWhole(L.costDzd),
    nextDueDate: optionalDay,
    nextDueKm: optionalWhole(L.km),
    note: optionalText(L.note),
  })
  .superRefine((entry, ctx) => {
    if (!notBefore(entry.nextDueDate, entry.date)) {
      ctx.addIssue({ code: 'custom', path: ['nextDueDate'], message: 'before_start' });
    }
    if (entry.nextDueKm !== null && entry.km !== null && entry.nextDueKm <= entry.km) {
      ctx.addIssue({ code: 'custom', path: ['nextDueKm'], message: 'below_km' });
    }
  });

export const repairSchema = z.object({
  date: requiredDay,
  km: optionalWhole(L.km),
  work: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(L.work.min, 'required').max(L.work.max, 'too_long')),
  garage: optionalText(L.garage),
  costDzd: optionalWhole(L.costDzd),
  note: optionalText(L.note),
});

export const insuranceSchema = z
  .object({
    company: optionalText(L.company),
    policyNumber: optionalText(L.policyNumber),
    startDate: optionalDay,
    expiryDate: optionalDay,
  })
  .refine((value) => notBefore(value.expiryDate, value.startDate), { path: ['expiryDate'], message: 'before_start' });

export const inspectionSchema = z
  .object({
    lastDate: optionalDay,
    nextDueDate: optionalDay,
    centre: optionalText(L.centre),
  })
  .refine((value) => notBefore(value.nextDueDate, value.lastDate), { path: ['nextDueDate'], message: 'before_start' });

export const vignetteSchema = z
  .object({
    paidDate: optionalDay,
    nextDueDate: optionalDay,
  })
  .refine((value) => notBefore(value.nextDueDate, value.paidDate), { path: ['nextDueDate'], message: 'before_start' });

export const notesSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(L.notes, 'too_long')
    .transform((value) => (value === '' ? null : value.replace(/\r\n/g, '\n'))),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type OilChangeInput = z.infer<typeof oilChangeSchema>;
export type RepairInput = z.infer<typeof repairSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
export type InspectionInput = z.infer<typeof inspectionSchema>;
export type VignetteInput = z.infer<typeof vignetteSchema>;
export type NotesInput = z.infer<typeof notesSchema>;

/** Which form a car book submission belongs to. */
export const CARE_SECTIONS = ['profile', 'oil', 'repair', 'insurance', 'inspection', 'vignette', 'notes'] as const;
export type CareSection = (typeof CARE_SECTIONS)[number];

export const CARE_SCHEMAS = {
  profile: profileSchema,
  oil: oilChangeSchema,
  repair: repairSchema,
  insurance: insuranceSchema,
  inspection: inspectionSchema,
  vignette: vignetteSchema,
  notes: notesSchema,
} as const;
