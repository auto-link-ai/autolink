import { ADMIN_ROLES, type AdminRole } from '@/lib/domain/constants';

/**
 * Admin session token — separate from owner (Auth.js) sessions.
 *
 * AES-256-GCM authenticated encryption with a key derived (HKDF) from
 * AUTH_SECRET under a dedicated label. Encryption rather than a bare signature
 * keeps the admin's database id out of the client entirely (rule 4); GCM's tag
 * makes any tampering fail closed. Web Crypto only, so middleware can verify it.
 *
 * Format: v1.<iv b64url>.<ciphertext b64url>
 */
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminSessionClaims {
  /** Admin user id (server-side use only; never readable by the browser). */
  sub: string;
  role: AdminRole;
  /** Expiry, seconds since epoch. */
  exp: number;
}

const VERSION = 'v1';
const KEY_INFO = 'autolink:admin-session:v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function deriveKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle
      .importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
      .then((base) =>
        crypto.subtle.deriveKey(
          { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode(KEY_INFO) },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt'],
        ),
      );
    keyCache.set(secret, key);
  }
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function isClaims(value: unknown): value is AdminSessionClaims {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    /^[a-f0-9]{24}$/i.test(v.sub) &&
    typeof v.role === 'string' &&
    (ADMIN_ROLES as readonly string[]).includes(v.role) &&
    typeof v.exp === 'number' &&
    Number.isFinite(v.exp)
  );
}

export async function sealAdminSession(
  input: { sub: string; role: AdminRole },
  secret: string | undefined,
  nowMs: number = Date.now(),
): Promise<string> {
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  const claims: AdminSessionClaims = {
    sub: input.sub,
    role: input.role,
    exp: Math.floor(nowMs / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await deriveKey(secret),
    encoder.encode(JSON.stringify(claims)),
  );
  return `${VERSION}.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

/** Returns the claims, or null for anything missing, tampered, malformed or expired. */
export async function openAdminSession(
  token: string | undefined,
  secret: string | undefined,
  nowMs: number = Date.now(),
): Promise<AdminSessionClaims | null> {
  if (!token || !secret || token.length > 1024) return null;
  const [version, ivPart, dataPart, extra] = token.split('.');
  if (version !== VERSION || !ivPart || !dataPart || extra !== undefined) return null;

  const iv = fromBase64Url(ivPart);
  const data = fromBase64Url(dataPart);
  if (!iv || iv.length !== 12 || !data) return null;

  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await deriveKey(secret), data);
    const claims: unknown = JSON.parse(decoder.decode(plaintext));
    if (!isClaims(claims)) return null;
    return claims.exp * 1000 > nowMs ? claims : null;
  } catch {
    return null;
  }
}
