import 'server-only';

/**
 * Cloudflare Turnstile, asked for only once someone has crossed the captcha
 * threshold — the scan page's budget forbids a third-party script on a normal
 * visit (and most visitors are a stranger doing someone a favour).
 *
 * With no keys configured the challenge is skipped rather than blocking
 * everyone: the per-tag and per-IP rate limits still apply.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5_000;

export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(turnstileSiteKey() && process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstile(token: string | null, ipHash: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !turnstileSiteKey()) return true;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  // `idempotency_key` keeps a retried submission from being rejected as reused.
  body.set('idempotency_key', ipHash.slice(0, 32));

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    // Cloudflare being unreachable must not take the scan page down with it.
    console.error('[turnstile] verification failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
