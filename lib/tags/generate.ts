import { randomBytes } from 'node:crypto';
import { formatActivationCode, ACTIVATION_CODE_LENGTH } from '@/lib/validation/activationCode';
import { PUBLIC_USER_ID_BODY_LENGTH, PUBLIC_USER_ID_PREFIX } from '@/lib/validation/publicUserId';
import { CROCKFORD_ALPHABET, TAG_ID_BODY_LENGTH, TAG_ID_PREFIX } from '@/lib/validation/tagId';

/**
 * Encodes the first `length * 5` bits of `bytes` as Crockford base32.
 * Every character consumes exactly 5 random bits, so all 32 symbols are equally
 * likely — no modulo bias.
 */
export function encodeCrockford(bytes: Uint8Array, length: number): string {
  if (bytes.length * 8 < length * 5) {
    throw new RangeError(`encodeCrockford: ${bytes.length} bytes cannot fill ${length} characters`);
  }
  let out = '';
  let buffer = 0;
  let bits = 0;
  let index = 0;
  while (out.length < length) {
    if (bits < 5) {
      buffer = ((buffer << 8) | (bytes[index++] ?? 0)) & 0xffff;
      bits += 8;
    }
    bits -= 5;
    out += CROCKFORD_ALPHABET.charAt((buffer >> bits) & 31);
  }
  return out;
}

/** Public tag ID: 'AUT-' + 8 chars = 40 random bits. Unguessable, non-sequential. */
export function generateTagId(): string {
  return TAG_ID_PREFIX + encodeCrockford(randomBytes(5), TAG_ID_BODY_LENGTH);
}

/** Private activation code: 10 chars = 50 random bits, formatted XXXX-XXXX-XX. */
export function generateActivationCode(): string {
  return formatActivationCode(encodeCrockford(randomBytes(7), ACTIVATION_CODE_LENGTH));
}

/** Opaque public handle for a tag batch (rule 4: never expose `_id`). */
export function generateBatchPublicId(): string {
  return 'B-' + encodeCrockford(randomBytes(5), 8);
}

/** Opaque public handle for a customer account, used in admin URLs. */
export function generatePublicUserId(): string {
  return PUBLIC_USER_ID_PREFIX + encodeCrockford(randomBytes(5), PUBLIC_USER_ID_BODY_LENGTH);
}

/** `count` distinct tag IDs. */
export function generateUniqueTagIds(count: number): string[] {
  const ids = new Set<string>();
  while (ids.size < count) ids.add(generateTagId());
  return [...ids];
}
