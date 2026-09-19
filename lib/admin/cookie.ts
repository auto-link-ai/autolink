import { ADMIN_SESSION_TTL_SECONDS } from './sessionToken';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * `__Host-` prefix in production: the browser only accepts the cookie over
 * HTTPS, for this exact host, on path "/". In development the plain name is
 * used so the admin also works over http://<LAN-IP> while testing on a phone.
 */
export const ADMIN_COOKIE_NAME = isProduction ? '__Host-autolink_admin' : 'autolink_admin';

export const adminCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: ADMIN_SESSION_TTL_SECONDS,
} as const;
