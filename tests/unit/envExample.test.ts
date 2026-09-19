import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// .env.example is committed. Any key that can hold a credential must stay empty there.
const SECRET_KEY = /(URI|SECRET|PASSWORD|SALT|_KEY|USERNAME|TOKEN)$/;

function parse(text: string): Array<[string, string]> {
  return text
    .split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line))
    .map((line) => {
      const eq = line.indexOf('=');
      return [line.slice(0, eq), line.slice(eq + 1).trim()];
    });
}

describe('.env.example', () => {
  const entries = parse(readFileSync('.env.example', 'utf8'));

  it('declares variables', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries.filter(([key]) => SECRET_KEY.test(key)))('%s is empty', (_key, value) => {
    expect(value).toBe('');
  });

  it('contains no connection strings anywhere', () => {
    expect(readFileSync('.env.example', 'utf8')).not.toMatch(/mongodb(\+srv)?:\/\/\S+@/);
  });
});
