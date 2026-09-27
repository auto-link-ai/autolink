import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';

/**
 * Counters for an outside API, one document per provider and day (Algeria's
 * calendar day), e.g. key 'gemini:2026-09-27'. Removed after 90 days.
 */
export interface ApiUsage {
  key: string;
  provider: string;
  /** YYYY-MM-DD. */
  day: string;
  checks: number;
  abusive: number;
  fine: number;
  failed: number;
  promptTokens: number;
  outputTokens: number;
  expiresAt: Date;
}

const apiUsageSchema = new Schema<ApiUsage>(
  {
    key: { type: String, required: true, unique: true, maxlength: 40 },
    provider: { type: String, required: true, maxlength: 20 },
    day: { type: String, required: true, maxlength: 10 },
    checks: { type: Number, default: 0, min: 0 },
    abusive: { type: Number, default: 0, min: 0 },
    fine: { type: Number, default: 0, min: 0 },
    failed: { type: Number, default: 0, min: 0 },
    promptTokens: { type: Number, default: 0, min: 0 },
    outputTokens: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'apiUsage' },
);

apiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
apiUsageSchema.index({ provider: 1, day: -1 });

export const ApiUsageModel: Model<ApiUsage> =
  (models.ApiUsage as Model<ApiUsage> | undefined) ?? model<ApiUsage>('ApiUsage', apiUsageSchema);
