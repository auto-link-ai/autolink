import 'server-only';
import { argon2id, hash, verify } from 'argon2';

/**
 * argon2id for passwords and activation codes.
 * Parameters are the OWASP baseline (19 MiB, 2 iterations, 1 lane): strong,
 * and light enough to hash a batch of activation codes inside a serverless
 * function's time limit.
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

/** Returns false on mismatch or on a malformed hash — never throws. */
export async function verifySecret(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
