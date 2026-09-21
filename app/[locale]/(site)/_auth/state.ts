import { isValidTagIdShape } from '@/lib/validation/tagId';

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

/**
 * Only same-site paths survive, so `?next=` can never bounce to another host:
 * a localized page, or a sticker's scan page (an owner signing in from it
 * comes back to their car).
 */
export function safeNext(next: unknown, locale: string, fallback = 'dashboard'): string {
  if (typeof next === 'string' && /^\/[a-z]{2}\/[^\s]*$/i.test(next) && !next.startsWith('//')) return next;
  if (typeof next === 'string' && next.startsWith('/t/') && isValidTagIdShape(next.slice(3))) return next;
  return `/${locale}/${fallback}`;
}
