import 'server-only';
import { createHmac } from 'node:crypto';

/**
 * Raw IP addresses are never stored. Everything that needs to recognise a
 * repeat visitor (rate limits, blocks) uses an HMAC keyed with IP_HASH_SALT.
 */
function hmacHex(value: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error('IP_HASH_SALT is not set.');
  return createHmac('sha256', salt).update(value).digest('hex');
}

export function hashIp(ip: string): string {
  return hmacHex(`ip:${ip}`);
}

/** For other identifiers used in rate-limit keys (e.g. a login email). */
export function hashForKey(namespace: string, value: string): string {
  return hmacHex(`${namespace}:${value.trim().toLowerCase()}`);
}

/**
 * Client IP as seen by the platform. On Vercel, x-forwarded-for is set by the
 * edge network (first entry = client). Locally there may be none.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || 'unknown';
}
