import 'server-only';
import { randomBytes } from 'node:crypto';
import { argon2id, hash, verify } from 'argon2';
import { encodeCrockford } from '@/lib/tags/generate';

/**
 * argon2id for passwords. Parameters are the OWASP baseline (19 MiB,
 * 2 iterations, 1 lane): strong, and light enough for a serverless function's
 * time limit.
 */
const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashSecret(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Generated admin password: 20 Crockford characters (100 bits) in groups of 5,
 * e.g. `7K3M9-QXZ2A-4B8CD-1EFGH`. No look-alike letters (I, L, O, U), so it
 * survives being read off a screen and typed by hand.
 */
export function generateReadablePassword(): string {
  return encodeCrockford(randomBytes(13), 20).match(/.{5}/g)!.join('-');
}

/** Returns false on mismatch or on a malformed hash — never throws. */
export async function verifySecret(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
