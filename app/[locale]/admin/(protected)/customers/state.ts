import type { CustomerContactInput } from '@/lib/validation/auth';

/**
 * State for the two forms of the customer panel that answer in place: the
 * contact correction and the temporary PIN. It lives outside the "use server"
 * file, which may only export async functions.
 */
export type ContactField = keyof CustomerContactInput;

export interface ContactState {
  status: 'idle' | 'error';
  /** Codes from lib/validation/auth.ts, or `phone_taken`. */
  fieldErrors?: Partial<Record<ContactField, string>>;
  formError?: 'not_found' | 'not_allowed';
}

export const CONTACT_INITIAL: ContactState = { status: 'idle' };

export interface TemporaryPinState {
  status: 'idle' | 'done' | 'error';
  /** Shown once, right after it is made. Never stored, never put in a URL. */
  pin?: string;
  error?: 'not_found' | 'not_allowed' | 'server_error';
}

export const TEMPORARY_PIN_INITIAL: TemporaryPinState = { status: 'idle' };
