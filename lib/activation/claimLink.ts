import { normalizeTagIdInput } from '@/lib/validation/tagId';

/**
 * Linking a sticker to an account, by address. Whoever scans a sticker that
 * is not linked yet while signed out is sent to
 * `/login?next=/ar/activate?t=AUT-…` (or `/register?next=…`). Both account
 * pages greet them with the sticker they came for, and both link it as soon
 * as the account is signed in.
 */

/** The page that links one sticker: one tap when signed in. */
export function linkPath(locale: string, publicTagId: string): string {
  return `/${locale}/activate?t=${encodeURIComponent(publicTagId)}`;
}

/** The sticker a sign-in or registration is on its way to link, if any. Anything else answers null. */
export function claimTagIdFromNext(next: string | undefined | null): string | null {
  if (!next || !/^\/[a-z]{2}\/activate(?:\?|$)/i.test(next)) return null;
  try {
    const tag = new URL(next, 'https://autolink.invalid').searchParams.get('t');
    return tag ? normalizeTagIdInput(tag) : null;
  } catch {
    return null;
  }
}

/**
 * Where to go once linking was tried: the dashboard, which then asks for the
 * car — or back to the link page, which says why it did not work.
 */
export function afterLink(
  locale: string,
  publicTagId: string,
  outcome: { ok: true } | { ok: false; reason: string },
): string {
  if (outcome.ok) return `/${locale}/dashboard?activated=${encodeURIComponent(publicTagId)}`;
  return `${linkPath(locale, publicTagId)}&error=${encodeURIComponent(outcome.reason)}`;
}
