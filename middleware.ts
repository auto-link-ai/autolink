import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip: API routes, the prefix-free scanner page (/t/...), Next internals,
  // Vercel internals, and anything with a file extension.
  matcher: ['/((?!api/|t/|_next|_vercel|.*\\..*).*)'],
};
