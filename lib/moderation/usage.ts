/**
 * Gemini usage, counted per day. Plain logic: reading the token counts Gemini
 * reports, and adding days up into the admin's today / 7 days / 30 days.
 */
export type CheckOutcome = 'abusive' | 'fine' | 'failed';

export interface Tokens {
  prompt: number;
  output: number;
}

export interface UsageDay {
  /** YYYY-MM-DD, Algeria's calendar day. */
  day: string;
  checks: number;
  abusive: number;
  fine: number;
  failed: number;
  promptTokens: number;
  outputTokens: number;
}

export type UsageTotals = Omit<UsageDay, 'day'>;

const ZERO: UsageTotals = { checks: 0, abusive: 0, fine: 0, failed: 0, promptTokens: 0, outputTokens: 0 };

/** Gemini's `usageMetadata`; zeros when it is missing (an error, a timeout). */
export function readUsage(response: unknown): Tokens {
  const usage = (response as { usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown } } | null)
    ?.usageMetadata;
  const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
  return { prompt: count(usage?.promptTokenCount), output: count(usage?.candidatesTokenCount) };
}

/** The day `days - 1` days before `today` (YYYY-MM-DD), for a window ending today. */
export function windowStart(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

/** Adds up the days that fall in the last `days` days, today included. */
export function totalsSince(rows: readonly UsageDay[], today: string, days: number): UsageTotals {
  const from = windowStart(today, days);
  return rows
    .filter((row) => row.day >= from && row.day <= today)
    .reduce(
      (sum, row) => ({
        checks: sum.checks + row.checks,
        abusive: sum.abusive + row.abusive,
        fine: sum.fine + row.fine,
        failed: sum.failed + row.failed,
        promptTokens: sum.promptTokens + row.promptTokens,
        outputTokens: sum.outputTokens + row.outputTokens,
      }),
      { ...ZERO },
    );
}
