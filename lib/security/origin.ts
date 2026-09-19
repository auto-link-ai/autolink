/**
 * Same-origin check for state-changing route handlers. Browsers always send
 * `Origin` on POST fetches; a missing or foreign origin is rejected.
 * (Server actions get Next.js's built-in equivalent.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
