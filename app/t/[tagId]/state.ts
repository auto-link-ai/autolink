/**
 * Form state for the scan page. Outside the "use server" file, which may only
 * export async functions.
 */
export interface ReportFormState {
  status: 'idle' | 'error';
  fieldErrors?: Record<string, string>;
  /** One of: rate_limited, unavailable, challenge_failed, server_error. */
  formError?: string;
  /** True once the sender has crossed the threshold and must pass a challenge. */
  challenge?: boolean;
}

export const REPORT_FORM_INITIAL: ReportFormState = { status: 'idle' };
