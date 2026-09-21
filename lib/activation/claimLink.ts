import { normalizeTagIdInput } from '@/lib/validation/tagId';

/**
 * The sticker a sign-in or registration is on its way to claim, if any.
 *
 * Someone who scans the claim QR on their slip while signed out is sent to
 * `/login?next=/fr/activate?t=AUT-…&c=…`. Both account pages use this to
 * greet them with the sticker they came for, instead of a bare form.
 * Anything that is not an activation link on this site answers null.
 */
export function claimTagIdFromNext(next: string | undefined | null): string | null {
  if (!next || !/^\/[a-z]{2}\/activate(?:\?|$)/i.test(next)) return null;
  try {
    const tag = new URL(next, 'https://autolink.invalid').searchParams.get('t');
    return tag ? normalizeTagIdInput(tag) : null;
  } catch {
    return null;
  }
}
