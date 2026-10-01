import { describe, expect, it } from 'vitest';
import {
  encodeCrockford,
  generateBatchPublicId,
  generateTagId,
  generateUniqueTagIds,
} from '@/lib/tags/generate';
import { CROCKFORD_ALPHABET, isValidTagIdShape } from '@/lib/validation/tagId';

describe('encodeCrockford', () => {
  it('maps 5-bit groups to the alphabet', () => {
    expect(encodeCrockford(new Uint8Array([0, 0, 0, 0, 0]), 8)).toBe('00000000');
    expect(encodeCrockford(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]), 8)).toBe('ZZZZZZZZ');
    // 0b00001_00010_00011_... → 1, 2, 3 …
    expect(encodeCrockford(new Uint8Array([0b00001000, 0b10000110]), 3)).toBe('123');
  });

  it('refuses when there are not enough bits', () => {
    expect(() => encodeCrockford(new Uint8Array(4), 8)).toThrow(RangeError);
  });

  it('is unbiased enough that every symbol appears across many draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const c of generateTagId().slice(4)) seen.add(c);
    expect(seen.size).toBe(CROCKFORD_ALPHABET.length);
  });
});

describe('generators', () => {
  it('tag ids match the strict shape', () => {
    for (let i = 0; i < 1000; i++) expect(isValidTagIdShape(generateTagId())).toBe(true);
  });



  it('batch public ids look like B-XXXXXXXX', () => {
    expect(generateBatchPublicId()).toMatch(/^B-[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  it('10k tag ids are all distinct', () => {
    const ids = new Set(Array.from({ length: 10_000 }, generateTagId));
    expect(ids.size).toBe(10_000);
  });

  it('generateUniqueTagIds returns exactly the requested count, deduplicated', () => {
    const ids = generateUniqueTagIds(250);
    expect(ids).toHaveLength(250);
    expect(new Set(ids).size).toBe(250);
  });
});
