/**
 * Repository: rateLimits (fixed-window counters with a TTL index)
 *
 * SECURITY BOUNDARY — only repositories import models. Keys are built on the
 * server from a tag id or an HMAC'd IP hash — never from raw client input and
 * never from a raw IP. Limits come from settings, not constants.
 *
 * Functions are added in Phase 2 (message limits) and Phase 3 (activation limits).
 */
import 'server-only';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: Date;
}
