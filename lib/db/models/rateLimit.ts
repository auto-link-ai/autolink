import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';

/**
 * Fixed-window counter. One document per key, e.g.
 * 'msg:tag:AUT-XXXXXXXX', 'msg:ip:<hash>', 'act:ip:<hash>'.
 */
export interface RateLimit {
  key: string;
  count: number;
  windowStart: Date;
  /** TTL index removes the row once the window is over. */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rateLimitSchema = new Schema<RateLimit>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0, min: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'rateLimits' },
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel: Model<RateLimit> =
  (models.RateLimit as Model<RateLimit> | undefined) ??
  model<RateLimit>('RateLimit', rateLimitSchema);
