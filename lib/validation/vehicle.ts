import { z } from 'zod';

/** Vehicle details entered at activation and edited from the dashboard. */
export const VEHICLE_FIELD_LIMITS = {
  brand: { min: 2, max: 40 },
  model: { min: 1, max: 40 },
  color: { min: 2, max: 30 },
  plate: { max: 20 },
} as const;

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(min, 'too_short').max(max, 'too_long'));

export const vehicleSchema = z.object({
  brand: text(VEHICLE_FIELD_LIMITS.brand.min, VEHICLE_FIELD_LIMITS.brand.max),
  model: text(VEHICLE_FIELD_LIMITS.model.min, VEHICLE_FIELD_LIMITS.model.max),
  color: text(VEHICLE_FIELD_LIMITS.color.min, VEHICLE_FIELD_LIMITS.color.max),
  // Private: stored for the owner only, never rendered on a public route.
  plateNumber: z
    .string()
    .trim()
    .max(VEHICLE_FIELD_LIMITS.plate.max, 'too_long')
    .transform((value) => (value === '' ? null : value.toUpperCase())),
  // An unchecked checkbox sends nothing at all, which means "off" — not "invalid".
  showDetailsPublicly: z
    .union([z.literal('on'), z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === 'on' || value === 'true' || value === true),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleField = keyof VehicleInput;
