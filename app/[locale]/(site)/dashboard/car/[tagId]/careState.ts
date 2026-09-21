/**
 * Shapes shared by the car book's server pages, its client form and its server
 * actions — kept outside the "use server" file, which may only export functions.
 */

export interface CareFormState {
  status: 'idle' | 'error';
  fieldErrors?: Partial<Record<string, string>>;
  formError?: string;
  /**
   * What was typed, sent back with the errors: a form posted before the page's
   * JavaScript was ready (or without it) is re-drawn by the server, and must
   * not come back empty.
   */
  values?: Record<string, string>;
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

/**
 * One field, described rather than rendered, so the client form can put its
 * error right under it. Everything here crosses to the browser: plain data only.
 */
export interface FieldSpec {
  name: string;
  label: string;
  kind: 'text' | 'date' | 'number' | 'select' | 'textarea';
  value?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  options?: { value: string; label: string }[];
  /** Ids, numbers, codes: always left to right, even in Arabic. */
  ltr?: boolean;
  /** Takes the full row on wide screens. */
  wide?: boolean;
  autoCapitalize?: 'characters';
}

export interface CareFormLabels {
  submit: string;
  working: string;
  cancel: string;
  /** "(required)", in words. */
  required: string;
  /** Heading of the list of fields to correct. */
  fixBelow: string;
  errors: Record<string, string>;
}
