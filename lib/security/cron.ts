import 'server-only';
import { timingSafeEqual } from 'node:crypto';

/** Shorter than this, a CRON_SECRET is treated as not set. */
const MIN_SECRET_LENGTH = 16;

/**
 * Vercel Cron calls with `Authorization: Bearer $CRON_SECRET`. Anything else —
 * including every call while no secret is configured — is refused, so a cron
 * endpoint is never a public trigger.
 */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authorization);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
