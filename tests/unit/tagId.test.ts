import { describe, expect, it } from 'vitest';
import {
  CROCKFORD_ALPHABET,
  isValidTagIdShape,
  normalizeTagIdInput,
  tagIdInputSchema,
  tagIdSchema,
} from '@/lib/validation/tagId';

describe('isValidTagIdShape (strict, used before any DB query)', () => {
  it('accepts canonical ids', () => {
    expect(isValidTagIdShape('AUT-7K3M9QXZ')).toBe(true);
    expect(isValidTagIdShape('AUT-00000000')).toBe(true);
  });

  it.each([
    'aut-7K3M9QXZ', // lowercase prefix
    'AUT-7k3m9qxz', // lowercase body
    'AUT7K3M9QXZ', // missing hyphen
    'AUT-7K3M9QX', // 7 chars
    'AUT-7K3M9QXZZ', // 9 chars
    'AUT-7K3M9QXI', // I excluded
    'AUT-7K3M9QXL', // L excluded
    'AUT-7K3M9QXO', // O excluded
    'AUT-7K3M9QXU', // U excluded
    ' AUT-7K3M9QXZ', // whitespace
    'AUT-7K3M9QXZ/..',
    '',
  ])('rejects %j', (value) => {
    expect(isValidTagIdShape(value)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isValidTagIdShape(undefined)).toBe(false);
    expect(isValidTagIdShape(12345678)).toBe(false);
  });

  it('alphabet is 32 chars without I, L, O, U', () => {
    expect(CROCKFORD_ALPHABET).toHaveLength(32);
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it('tagIdSchema enforces the strict shape', () => {
    expect(tagIdSchema.safeParse('AUT-7K3M9QXZ').success).toBe(true);
    expect(tagIdSchema.safeParse('aut-7k3m9qxz').success).toBe(false);
  });
});

describe('normalizeTagIdInput (lenient, for typed input)', () => {
  it.each([
    ['AUT-7K3M9QXZ', 'AUT-7K3M9QXZ'],
    ['aut-7k3m9qxz', 'AUT-7K3M9QXZ'],
    ['AUT 7K3M 9QXZ', 'AUT-7K3M9QXZ'],
    ['7K3M9QXZ', 'AUT-7K3M9QXZ'],
    ['7k3m-9qxz', 'AUT-7K3M9QXZ'],
    ['AUT-7K3M9QXO', 'AUT-7K3M9QX0'], // O → 0
    ['AUT-IK3M9QXL', 'AUT-1K3M9QX1'], // I, L → 1
  ])('%j → %s', (input, expected) => {
    expect(normalizeTagIdInput(input)).toBe(expected);
  });

  it.each(['AUT-7K3M9QXU', 'AUT-7K3M9QX', '', 'hello world', 'XYZ-7K3M9QXZ'])(
    'rejects %j',
    (input) => {
      expect(normalizeTagIdInput(input)).toBeNull();
    },
  );

  it('tagIdInputSchema normalizes', () => {
    expect(tagIdInputSchema.parse(' aut 7k3m9qxz ')).toBe('AUT-7K3M9QXZ');
  });
});
