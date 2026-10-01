import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** public/data/communes, built from Wikidata by scripts/build-communes.ts. */
const dir = path.join(process.cwd(), 'public', 'data', 'communes');
const read = (code: string) =>
  JSON.parse(readFileSync(path.join(dir, `${code}.json`), 'utf8')) as { fr: string; ar: string }[];
const codes = Array.from({ length: 58 }, (_, i) => String(i + 1).padStart(2, '0'));

describe('the communes offered by the order form', () => {
  it('has one file per wilaya, 01 to 58, and nothing else', () => {
    expect(readdirSync(dir).sort()).toEqual(codes.map((code) => `${code}.json`));
  });

  it('lists every wilaya’s communes, about the 1 541 there are', () => {
    const total = codes.reduce((sum, code) => sum + read(code).length, 0);
    expect(total).toBeGreaterThan(1520);
    expect(total).toBeLessThan(1560);
    for (const code of codes) expect(read(code).length, code).toBeGreaterThan(0);
    expect(read('16')).toHaveLength(57); // Alger
  });

  it('names each commune once per wilaya, in French and Arabic, with no « بلدية » prefix', () => {
    for (const code of codes) {
      const communes = read(code);
      expect(new Set(communes.map((c) => c.fr)).size, code).toBe(communes.length);
      for (const c of communes) {
        expect(c.fr.trim().length).toBeGreaterThan(1);
        expect(c.ar.trim().length).toBeGreaterThan(1);
        expect(c.ar.startsWith('بلدية')).toBe(false);
      }
    }
  });

  it('puts the newer wilayas’ communes where they belong', () => {
    expect(read('49').map((c) => c.fr)).toContain('Timimoun');
    expect(read('55').map((c) => c.fr)).toContain('Touggourt');
    expect(read('03').map((c) => c.fr)).toContain('Aflou');
  });
});
