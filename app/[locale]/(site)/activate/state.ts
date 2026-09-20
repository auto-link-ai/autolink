/** Form state for /activate, kept out of the "use server" module. */
export interface ActivateFormState {
  status: 'idle' | 'error';
  fieldErrors?: Record<string, string>;
  formError?: string;
}

export const ACTIVATE_FORM_INITIAL: ActivateFormState = { status: 'idle' };
