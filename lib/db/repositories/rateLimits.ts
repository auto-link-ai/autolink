/**
 * Repository: rateLimits (fixed-window counters with a TTL index)
 *
 * SECURITY BOUNDARY — only repositories import models. Keys are built on the
 * server from a tag id or an HMAC'd hash — never from raw client input and
 * never from a raw IP. Limits come from settings, not constants.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { RateLimitModel } from '@/lib/db/models/rateLimit';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: Date;
}

export const rateLimitsRepository = {
  /**
   * Counts one hit against `key` and reports whether it is within `limit` for
   * the current window. A single atomic update: it increments inside a live
   * window, or starts a new window (count 1) once the previous one has expired.
   */
  async hit(key: string, limit: number, windowMs: number, now: Date = new Date()): Promise<RateLimitResult> {
    await connectToDatabase();
    const windowEnd = new Date(now.getTime() + windowMs);
    const inWindow = { $gt: ['$expiresAt', now] };

    const doc = await RateLimitModel.findOneAndUpdate(
      { key },
      [
        {
          $set: {
            key,
            count: { $cond: [inWindow, { $add: ['$count', 1] }, 1] },
            windowStart: { $cond: [inWindow, '$windowStart', now] },
            expiresAt: { $cond: [inWindow, '$expiresAt', windowEnd] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after', updatePipeline: true, timestamps: false, lean: true },
    );

    const count = doc?.count ?? 1;
    return { allowed: count <= limit, count, resetAt: doc?.expiresAt ?? windowEnd };
  },
};
