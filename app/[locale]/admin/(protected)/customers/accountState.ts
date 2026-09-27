/** What the « new customer » form gets back. Lives outside the "use server" file. */
export interface NewCustomerState {
  status: 'idle' | 'done' | 'error';
  /** Shown once, right after the account is made. Never stored, never put in a URL. */
  password?: string;
  publicUserId?: string;
  fieldErrors?: Partial<Record<'email' | 'name' | 'phone', string>>;
  formError?: 'email_taken' | 'not_allowed' | 'server_error';
}

export const NEW_CUSTOMER_INITIAL: NewCustomerState = { status: 'idle' };
