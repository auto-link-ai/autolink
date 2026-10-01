import { describe, expect, it } from 'vitest';
import { afterLink, claimTagIdFromNext, linkPath } from '@/lib/activation/claimLink';

describe('claimTagIdFromNext', () => {
  it('finds the sticker in a claim link, whatever the language', () => {
    expect(claimTagIdFromNext('/fr/activate?t=AUT-7K3M9QXZ&c=ABCD-EFGH-JK')).toBe('AUT-7K3M9QXZ');
    expect(claimTagIdFromNext('/ar/activate?t=AUT-7K3M9QXZ')).toBe('AUT-7K3M9QXZ');
    // Typed by hand, lower case: normalised like the activation form does.
    expect(claimTagIdFromNext('/en/activate?t=aut-7k3m9qxz')).toBe('AUT-7K3M9QXZ');
  });

  it('says nothing for any other destination', () => {
    for (const next of [undefined, null, '', '/fr/dashboard', '/fr/activate', '/fr/order?t=AUT-7K3M9QXZ']) {
      expect(claimTagIdFromNext(next), String(next)).toBeNull();
    }
  });

  it('never greets anyone with a malformed or foreign id', () => {
    expect(claimTagIdFromNext('/fr/activate?t=<script>')).toBeNull();
    expect(claimTagIdFromNext('/fr/activate?t=AUT-BAD')).toBeNull();
    // Only same-site activation paths count, never an absolute URL.
    expect(claimTagIdFromNext('https://evil.example/fr/activate?t=AUT-7K3M9QXZ')).toBeNull();
    expect(claimTagIdFromNext('//evil.example/fr/activate?t=AUT-7K3M9QXZ')).toBeNull();
  });
});

describe('the way to link a sticker, and back', () => {
  it('builds the link page that sign-in sends people to', () => {
    expect(linkPath('ar', 'AUT-7K3M9QXZ')).toBe('/ar/activate?t=AUT-7K3M9QXZ');
    expect(claimTagIdFromNext(linkPath('fr', 'AUT-7K3M9QXZ'))).toBe('AUT-7K3M9QXZ');
  });

  it('lands on the dashboard once linked, or back on the link page with why', () => {
    expect(afterLink('fr', 'AUT-7K3M9QXZ', { ok: true })).toBe('/fr/dashboard?activated=AUT-7K3M9QXZ');
    expect(afterLink('ar', 'AUT-7K3M9QXZ', { ok: false, reason: 'invalid' })).toBe(
      '/ar/activate?t=AUT-7K3M9QXZ&error=invalid',
    );
  });
});
