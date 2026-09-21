/**
 * What this browser can do about notifications. Plain logic with no browser
 * globals, so it runs in unit tests; the dashboard feeds it what it sees.
 */

export type PushSupport = 'ready' | 'insecure' | 'ios-install' | 'unsupported';

export interface BrowserTraits {
  /** `window.isSecureContext`: push needs https (or localhost). */
  secure: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  ios: boolean;
  /** Opened from the Home Screen rather than a browser tab. */
  standalone: boolean;
}

export function pushSupport(traits: BrowserTraits): PushSupport {
  if (!traits.secure) return 'insecure';
  // iPhones offer web push only to a site added to the Home Screen, and hide
  // the APIs everywhere else — so "missing" there means "install first".
  if (traits.ios && !traits.standalone) return 'ios-install';
  if (!traits.serviceWorker || !traits.pushManager || !traits.notification) return 'unsupported';
  return 'ready';
}

/** iPhone, iPod, or an iPad that reports itself as a Mac. */
export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

/** base64url (what VAPID keys look like) → the bytes the browser wants. */
export function toKeyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Was this subscription made with the server's current key? After a key change
 * the browser refuses to subscribe again until the old one is dropped.
 */
export function sameKey(existing: ArrayBuffer | null | undefined, current: Uint8Array): boolean {
  if (!existing) return false;
  const bytes = new Uint8Array(existing);
  if (bytes.length !== current.length) return false;
  return bytes.every((byte, i) => byte === current[i]);
}
