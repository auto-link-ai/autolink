/**
 * Repository: apiUsage (per-day counters for the Gemini message check)
 *
 * SECURITY BOUNDARY — only repositories import models. Written by the system
 * after each check; read by an admin. Counts only: never a message, never a key.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { ApiUsageModel } from '@/lib/db/models/apiUsage';
import { windowStart, type CheckOutcome, type Tokens, type UsageDay } from '@/lib/moderation/usage';
import type { AdminActor, SystemActor } from './actor';

const KEEP_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export const apiUsageRepository = {
  /** One Gemini check, counted on `day` (Algeria's calendar day, YYYY-MM-DD). */
  async recordGeminiCheck(_system: SystemActor, day: string, outcome: CheckOutcome, tokens: Tokens): Promise<void> {
    await connectToDatabase();
    await ApiUsageModel.updateOne(
      { key: `gemini:${day}` },
      {
        $inc: { checks: 1, [outcome]: 1, promptTokens: tokens.prompt, outputTokens: tokens.output },
        $setOnInsert: {
          provider: 'gemini',
          day,
          expiresAt: new Date(new Date(`${day}T00:00:00.000Z`).getTime() + KEEP_DAYS * DAY_MS),
        },
      },
      { upsert: true },
    );
  },

  /** The last `days` days up to `today`, newest first; days without checks are absent. */
  async geminiDays(_admin: AdminActor, today: string, days = 30): Promise<UsageDay[]> {
    await connectToDatabase();
    const rows = await ApiUsageModel.find(
      { provider: 'gemini', day: { $gte: windowStart(today, days), $lte: today } },
      { _id: 0, day: 1, checks: 1, abusive: 1, fine: 1, failed: 1, promptTokens: 1, outputTokens: 1 },
    )
      .sort({ day: -1 })
      .lean();
    return rows.map((row) => ({
      day: row.day,
      checks: row.checks,
      abusive: row.abusive,
      fine: row.fine,
      failed: row.failed,
      promptTokens: row.promptTokens,
      outputTokens: row.outputTokens,
    }));
  },
};
