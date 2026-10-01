import { describe, expect, it } from 'vitest';
import { localDay, shouldRenew } from '@/lib/auth/renewal';

describe('renewing the sign-in', () => {
  it('renews once a day: the first page of the day, not the next ones', () => {
    expect(shouldRenew(null, '2026-10-01')).toBe(true);
    expect(shouldRenew('2026-09-30', '2026-10-01')).toBe(true);
    expect(shouldRenew('2026-10-01', '2026-10-01')).toBe(false);
  });

  it('counts days on the phone’s own calendar', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDay(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });
});
