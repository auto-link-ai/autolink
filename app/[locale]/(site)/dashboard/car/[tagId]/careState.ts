/** Form state for the car book, outside the "use server" file. */
export interface CareFormState {
  status: 'idle' | 'saved' | 'error';
  fieldErrors?: Partial<Record<string, string>>;
  formError?: string;
}

export const CARE_FORM_INITIAL: CareFormState = { status: 'idle' };

/** Every error code a car book form can come back with (see lib/validation/carCare.ts). */
export const CARE_ERROR_CODES = [
  'required',
  'too_long',
  'too_short',
  'invalid_date',
  'invalid_number',
  'invalid_year',
  'invalid_vin',
  'before_start',
  'below_km',
  'invalid',
  'server_error',
] as const;
