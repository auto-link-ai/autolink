import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * An opaque id for one scanner, so repeat messages can be grouped and abuse
 * traced without knowing who they are. It identifies a browser, nothing else:
 * no name, no account, and never the IP (that is stored only as an HMAC).
 */
export const SCANNER_COOKIE = 'autolink_scan';
const TTL_SECONDS = 180 * 24 * 60 * 60;

export function newScannerSessionId(): string {
  return randomBytes(16).toString('base64url');
}

/** Reads the current id, or null when this browser has never sent anything. */
export async function readScannerSessionId(): Promise<string | null> {
  return (await cookies()).get(SCANNER_COOKIE)?.value ?? null;
}

/** Reads it, creating and setting one when there is none. Server actions only. */
export async function ensureScannerSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SCANNER_COOKIE)?.value;
  if (existing) return existing;

  const id = newScannerSessionId();
  jar.set(SCANNER_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  });
  return id;
}
