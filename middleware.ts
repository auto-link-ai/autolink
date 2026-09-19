import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n/locales';
import { routing } from './i18n/routing';
import { ADMIN_COOKIE_NAME } from './lib/admin/cookie';
import { openAdminSession } from './lib/admin/sessionToken';

const handleI18n = createMiddleware(routing);
const ADMIN_PATH = new RegExp(`^/(${locales.join('|')})/admin(?:/(.*))?$`);

/**
 * First gate for /{locale}/admin/**: a valid, unexpired admin session cookie.
 * This is a signature check only — every admin page, action and route handler
 * re-verifies the session against the database (rule 6).
 */
export default async function middleware(request: NextRequest) {
  const match = ADMIN_PATH.exec(request.nextUrl.pathname);
  if (match) {
    const locale = match[1] ?? routing.defaultLocale;
    const rest = match[2] ?? '';
    const isLogin = rest === 'login' || rest.startsWith('login/');
    if (!isLogin) {
      const session = await openAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value, process.env.AUTH_SECRET);
      if (!session) return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
  }
  return handleI18n(request);
}

export const config = {
  // Skip: API routes, the prefix-free scanner page (/t/...), Next internals,
  // Vercel internals, and anything with a file extension.
  matcher: ['/((?!api/|t/|_next|_vercel|.*\\..*).*)'],
};
