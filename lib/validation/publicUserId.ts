/**
 * Public account IDs: 'USR-' + 8 Crockford base32 characters (no I, L, O, U).
 * Example: USR-7K3M9QXZ
 *
 * The admin addresses a customer by this, never by their Mongo `_id` (rule 4)
 * and never by their email — an address in a URL ends up in browser history
 * and server logs.
 */
export const PUBLIC_USER_ID_PREFIX = 'USR-';
export const PUBLIC_USER_ID_BODY_LENGTH = 8;
export const PUBLIC_USER_ID_PATTERN = /^USR-[0-9A-HJKMNP-TV-Z]{8}$/;

/** Strict shape check, run before any database query. */
export function isValidPublicUserId(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_USER_ID_PATTERN.test(value);
}
