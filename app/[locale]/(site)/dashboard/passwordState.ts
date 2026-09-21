/**
 * State for the change-password form. Outside the "use server" file, which
 * may only export async functions.
 */
export interface ChangePasswordState {
  status: 'idle' | 'done' | 'error';
  fieldErrors?: Record<string, string>;
  /** wrong_current, rate_limited, server_error. */
  formError?: string;
}

export const CHANGE_PASSWORD_INITIAL: ChangePasswordState = { status: 'idle' };
