import { describe, expect, it } from 'vitest';
import { isIosDevice, pushSupport, sameKey, toKeyBytes, type BrowserTraits } from '@/lib/notifications/support';

const CHROME: BrowserTraits = {
  secure: true,
  serviceWorker: true,
  pushManager: true,
  notification: true,
  ios: false,
  standalone: false,
};
// iPhone Safari in a tab hides the push APIs altogether.
const IPHONE_TAB: BrowserTraits = { ...CHROME, ios: true, pushManager: false, notification: false };

describe('pushSupport', () => {
  it('is ready on an ordinary https browser', () => {
    expect(pushSupport(CHROME)).toBe('ready');
  });

  it('says https is missing before anything else', () => {
    // A phone opening http://192.168.x.x has none of the APIs either.
    expect(pushSupport({ ...CHROME, secure: false, serviceWorker: false })).toBe('insecure');
  });

  it('sends an iPhone in a browser tab to the Home Screen', () => {
    expect(pushSupport(IPHONE_TAB)).toBe('ios-install');
  });

  it('is ready on an iPhone opened from the Home Screen', () => {
    expect(pushSupport({ ...CHROME, ios: true, standalone: true })).toBe('ready');
  });

  it('is unsupported on an iPhone too old for web push, even from the Home Screen', () => {
    expect(pushSupport({ ...IPHONE_TAB, standalone: true })).toBe('unsupported');
  });

  it('is unsupported when any of the three APIs is missing', () => {
    expect(pushSupport({ ...CHROME, serviceWorker: false })).toBe('unsupported');
    expect(pushSupport({ ...CHROME, pushManager: false })).toBe('unsupported');
    expect(pushSupport({ ...CHROME, notification: false })).toBe('unsupported');
  });
});

describe('isIosDevice', () => {
  it('recognises iPhones and iPads, including iPads that claim to be a Mac', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)', 'iPhone', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
  });

  it('leaves Macs and Android alone', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l', 5)).toBe(false);
  });
});

describe('sameKey', () => {
  const key = toKeyBytes('BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U');

  it('decodes a VAPID public key to its 65 bytes', () => {
    expect(key.length).toBe(65);
    expect(key[0]).toBe(0x04);
  });

  it('matches a subscription made with the same key', () => {
    expect(sameKey(key.slice().buffer, key)).toBe(true);
  });

  it('spots a subscription made with another key, or none', () => {
    const other = key.slice();
    other[10] = (other[10]! + 1) % 256;
    expect(sameKey(other.buffer, key)).toBe(false);
    expect(sameKey(new ArrayBuffer(10), key)).toBe(false);
    expect(sameKey(null, key)).toBe(false);
  });
});
