import { z } from 'zod';
import { toAsciiDigits } from './digits';

/**
 * Public tag IDs: 'AUT-' + 8 Crockford base32 characters (no I, L, O, U).
 * Example: AUT-7K3M9QXZ
 */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const TAG_ID_PREFIX = 'AUT-';
export const TAG_ID_BODY_LENGTH = 8;
export const TAG_ID_PATTERN = /^AUT-[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * Strict shape check. Used on /t/[tagId] BEFORE any database query — a
 * malformed ID renders the not-available state without touching the DB.
 */
export function isValidTagIdShape(value: unknown): value is string {
  return typeof value === 'string' && TAG_ID_PATTERN.test(value);
}

/** Crockford decoding: commonly misread letters map to the digit they resemble. */
const CROCKFORD_ALIASES: Readonly<Record<string, string>> = { I: '1', L: '1', O: '0' };

/**
 * Lenient normalization for IDs a person types (e.g. on /activate): accepts
 * lowercase, spaces, missing hyphen or missing 'AUT-' prefix, and I/L/O typos.
 * Returns the canonical ID, or null if it cannot be one.
 */
export function normalizeTagIdInput(input: string): string | null {
  const compact = toAsciiDigits(input).toUpperCase().replace(/[\s\-_]/g, '');

  let body: string;
  if (compact.length === 3 + TAG_ID_BODY_LENGTH && compact.startsWith('AUT')) {
    body = compact.slice(3);
  } else if (compact.length === TAG_ID_BODY_LENGTH) {
    body = compact;
  } else {
    return null;
  }

  body = body.replace(/[ILO]/g, (c) => CROCKFORD_ALIASES[c] ?? c);
  const candidate = `${TAG_ID_PREFIX}${body}`;
  return isValidTagIdShape(candidate) ? candidate : null;
}

/** For route params and API payloads: exact canonical form only. */
export const tagIdSchema = z.string().refine(isValidTagIdShape, { message: 'invalid_tag_id' });

/** For human input: normalizes, then validates. */
export const tagIdInputSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeTagIdInput(value);
  if (!normalized) {
    ctx.addIssue({ code: 'custom', message: 'invalid_tag_id' });
    return z.NEVER;
  }
  return normalized;
});
