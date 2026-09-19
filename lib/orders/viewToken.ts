import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The browser that placed an order gets an httpOnly cookie proving it, so
 * /order/[orderRef] can show the full summary to that browser only. Anyone
 * who guesses a reference sees the reference and nothing personal.
 */
export const ORDER_VIEW_COOKIE = 'autolink_order';
export const ORDER_VIEW_TTL_SECONDS = 7 * 24 * 60 * 60;

function key(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return secret;
}

export function orderViewToken(orderRef: string): string {
  return createHmac('sha256', key()).update(`autolink:order-view:v1:${orderRef}`).digest('base64url');
}

export function isValidOrderViewToken(orderRef: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(orderViewToken(orderRef));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
