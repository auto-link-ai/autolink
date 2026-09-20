/**
 * State for the reset-password form. It lives outside the "use server" file,
 * which may only export async functions.
 */
export interface ResetPasswordState {
  status: 'idle' | 'done' | 'error';
  /** Shown once, right after the reset. Never stored, never put in a URL. */
  password?: string;
  error?: 'not_found' | 'not_allowed' | 'invalid' | 'server_error';
}

export const RESET_PASSWORD_INITIAL: ResetPasswordState = { status: 'idle' };
