import { describe, expect, it } from 'vitest';
import { installMode } from '@/lib/pwa/install';

describe('installMode', () => {
  it('offers nothing once AutoLink is opened as the app, on any phone', () => {
    expect(installMode({ standalone: true, ios: true, canPrompt: false })).toBe('installed');
    expect(installMode({ standalone: true, ios: false, canPrompt: true })).toBe('installed');
  });

  it("uses the browser's own install window when it offers one", () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: true })).toBe('prompt');
  });

  it('shows the Share-menu steps on an iPhone, which cannot be installed by a website', () => {
    expect(installMode({ standalone: false, ios: true, canPrompt: false })).toBe('ios');
  });

  it('shows no button where the browser cannot install apps', () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: false })).toBe('none');
  });
});
