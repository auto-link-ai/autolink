import { describe, expect, it } from 'vitest';
import { readUsage, totalsSince, windowStart, type UsageDay } from '@/lib/moderation/usage';

describe('readUsage', () => {
  it("reads Gemini's own token counts", () => {
    expect(readUsage({ usageMetadata: { promptTokenCount: 312, candidatesTokenCount: 27, totalTokenCount: 339 } })).toEqual({
      prompt: 312,
      output: 27,
    });
  });

  it('counts nothing when they are missing or odd', () => {
    for (const response of [null, {}, { usageMetadata: {} }, { usageMetadata: { promptTokenCount: -4, candidatesTokenCount: 'x' } }]) {
      expect(readUsage(response)).toEqual({ prompt: 0, output: 0 });
    }
  });
});

describe('totals', () => {
  const day = (d: string, checks: number): UsageDay => ({
    day: d,
    checks,
    abusive: 1,
    fine: checks - 1,
    failed: 0,
    promptTokens: checks * 300,
    outputTokens: checks * 20,
  });
  const rows = [day('2026-09-27', 4), day('2026-09-25', 3), day('2026-09-21', 2), day('2026-09-01', 10), day('2026-08-20', 50)];

  it('knows where a window starts, across months', () => {
    expect(windowStart('2026-09-27', 1)).toBe('2026-09-27');
    expect(windowStart('2026-09-27', 7)).toBe('2026-09-21');
    expect(windowStart('2026-03-02', 7)).toBe('2026-02-24');
  });

  it('adds up today, the last 7 days and the last 30 days', () => {
    expect(totalsSince(rows, '2026-09-27', 1).checks).toBe(4);
    expect(totalsSince(rows, '2026-09-27', 7)).toMatchObject({ checks: 9, abusive: 3, promptTokens: 2700 });
    expect(totalsSince(rows, '2026-09-27', 30).checks).toBe(19);
  });
});
