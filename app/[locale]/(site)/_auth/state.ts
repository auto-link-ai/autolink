/**
 * Form state shared by the auth forms and their server actions. It lives
 * outside the "use server" files, which may only export async functions.
 */
export interface AuthFormState {
  status: 'idle' | 'error';
  fieldErrors?: Record<string, string>;
  formError?: string;
}

export const AUTH_FORM_INITIAL: AuthFormState = { status: 'idle' };

/** Only same-site paths survive, so `?next=` can never bounce to another host. */
export function safeNext(next: unknown, locale: string, fallback = 'dashboard'): string {
  if (typeof next === 'string' && /^\/[a-z]{2}\/[^\s]*$/i.test(next) && !next.startsWith('//')) return next;
  return `/${locale}/${fallback}`;
}
