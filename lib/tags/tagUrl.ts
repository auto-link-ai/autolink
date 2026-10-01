import { isValidTagIdShape } from '@/lib/validation/tagId';

/**
 * The QR code encodes `{NEXT_PUBLIC_APP_URL}/t/{publicTagId}` and nothing else.
 *
 * A sticker printed with the wrong base URL is scrap, so generation refuses to
 * run unless the base URL is a bare origin — and, in production, an https URL
 * on a real hostname (no localhost, no IP address).
 */
export type QrBaseUrlProblem = 'base_url_missing' | 'base_url_invalid' | 'base_url_not_https' | 'base_url_local_host';

export type QrBaseUrlResult =
  | { ok: true; baseUrl: string }
  | { ok: false; problem: QrBaseUrlProblem; value: string | null };

const LOCAL_HOST = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[?::1\]?)$/i;
const IP_ADDRESS = /^(\d{1,3}(?:\.\d{1,3}){3}|\[[0-9a-f:]+\])$/i;

export function resolveQrBaseUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_APP_URL,
  isProduction: boolean = process.env.NODE_ENV === 'production',
): QrBaseUrlResult {
  const value = raw?.trim() || null;
  if (!value) return { ok: false, problem: 'base_url_missing', value };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, problem: 'base_url_invalid', value };
  }

  const bareOrigin = (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
  if (!['http:', 'https:'].includes(url.protocol) || !bareOrigin || url.username || url.password) {
    return { ok: false, problem: 'base_url_invalid', value };
  }

  if (isProduction) {
    if (url.protocol !== 'https:') return { ok: false, problem: 'base_url_not_https', value };
    if (LOCAL_HOST.test(url.hostname) || IP_ADDRESS.test(url.hostname)) {
      return { ok: false, problem: 'base_url_local_host', value };
    }
  }

  return { ok: true, baseUrl: url.origin };
}

export function tagUrl(baseUrl: string, publicTagId: string): string {
  if (!isValidTagIdShape(publicTagId)) {
    throw new RangeError(`tagUrl: invalid tag id ${publicTagId}`);
  }
  return `${baseUrl}/t/${publicTagId}`;
}
