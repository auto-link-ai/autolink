/**
 * State for the change-PIN form. Outside the "use server" file, which may only
 * export async functions.
 */
export interface ChangePinState {
  status: 'idle' | 'error';
  fieldErrors?: Record<string, string>;
  /** throttled, server_error. */
  formError?: string;
}

export const CHANGE_PIN_INITIAL: ChangePinState = { status: 'idle' };
