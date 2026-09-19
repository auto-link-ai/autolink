import { randomBytes } from 'node:crypto';
import { ORDER_REF_PATTERN } from '@/lib/domain/constants';
import { encodeCrockford } from '@/lib/tags/generate';
import { toAsciiDigits } from '@/lib/validation/digits';
import { applyCrockfordAliases } from '@/lib/validation/tagId';

/** 'AL-' + 6 Crockford characters (30 random bits). Collisions are retried by the repository. */
export function generateOrderRef(): string {
  return `AL-${encodeCrockford(randomBytes(4), 6)}`;
}

export function isValidOrderRef(value: unknown): value is string {
  return typeof value === 'string' && ORDER_REF_PATTERN.test(value);
}

/** Lenient input ("al-7k3m9q", "7K3M9Q") → canonical ref, or null. For admin search. */
export function normalizeOrderRefInput(input: string): string | null {
  let compact = toAsciiDigits(input).toUpperCase().replace(/[\s\-_]/g, '');
  if (compact.startsWith('AL') && compact.length === 8) compact = compact.slice(2);
  const candidate = `AL-${applyCrockfordAliases(compact)}`;
  return isValidOrderRef(candidate) ? candidate : null;
}
