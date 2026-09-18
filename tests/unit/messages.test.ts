import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.json';
import en from '@/messages/en.json';
import fr from '@/messages/fr.json';
import { MESSAGE_CATEGORIES } from '@/lib/domain/constants';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('message catalogues', () => {
  const frKeys = keyPaths(fr).sort();

  it.each([
    ['ar', ar],
    ['en', en],
  ])('%s has exactly the same keys as fr', (_locale, catalogue) => {
    expect(keyPaths(catalogue).sort()).toEqual(frKeys);
  });

  it('every catalogue labels every scanner category', () => {
    for (const catalogue of [fr, ar, en]) {
      for (const category of MESSAGE_CATEGORIES) {
        expect(catalogue.scanner.categories[category]).toBeTruthy();
      }
    }
  });
});
