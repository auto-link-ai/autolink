import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { hashSecret, verifySecret } from './password';

/**
 * PINs and verification codes are short — 10,000 PINs, a million codes — so a
 * leaked hash alone must not be enough to find them. Everything is first
 * HMAC'd with PIN_SECRET, which lives in the environment, never in the
 * database. It is its own secret, not derived from AUTH_SECRET, so rotating
 * the session key never locks every owner out.
 */
function pinSecret(): string {
  const secret = process.env.PIN_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error('PIN_SECRET is not set (32 characters or more).');
  return secret;
}

/** HMAC-SHA256 of `value` under PIN_SECRET, namespaced so a PIN digest is never a code digest. */
export function secretDigest(namespace: string, value: string): string {
  return createHmac('sha256', pinSecret()).update(`${namespace}:${value}`).digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** argon2id over the HMAC: the PIN as stored. */
export function hashPin(pin: string): Promise<string> {
  return hashSecret(secretDigest('pin', pin));
}

/** False on mismatch or a malformed hash — never throws. */
export function verifyPin(storedHash: string, pin: string): Promise<boolean> {
  return verifySecret(storedHash, secretDigest('pin', pin));
}
