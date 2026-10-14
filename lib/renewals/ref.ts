import { randomBytes } from 'node:crypto';
import { RENEWAL_REF_PATTERN } from '@/lib/domain/constants';
import { encodeCrockford } from '@/lib/tags/generate';

/** 'RN-' + 6 Crockford characters (30 random bits). Collisions are retried by the repository. */
export function generateRenewalRef(): string {
  return `RN-${encodeCrockford(randomBytes(4), 6)}`;
}

export function isValidRenewalRef(value: unknown): value is string {
  return typeof value === 'string' && RENEWAL_REF_PATTERN.test(value);
}
