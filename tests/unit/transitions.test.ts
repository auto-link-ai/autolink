import { describe, expect, it } from 'vitest';
import { TAG_STATUSES } from '@/lib/domain/constants';
import { allowedFrom, availableActions, canApply, targetStatus } from '@/lib/tags/transitions';

describe('tag status transitions', () => {
  it('matches the agreed table', () => {
    expect(allowedFrom('suspend')).toEqual(['ACTIVE']);
    expect(allowedFrom('deactivate')).toEqual(['ACTIVE', 'SUSPENDED']);
    expect(allowedFrom('markLost')).toEqual(['UNASSIGNED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']);
    expect(allowedFrom('reactivate')).toEqual(['SUSPENDED', 'DEACTIVATED', 'LOST']);
  });

  it('never allows a no-op transition', () => {
    for (const status of TAG_STATUSES) {
      for (const action of availableActions(status)) {
        const to = targetStatus(action, { hasOwner: true });
        if (action !== 'reactivate') expect(to).not.toBe(status);
      }
    }
  });

  it('reactivate returns to ACTIVE only for owned tags', () => {
    expect(targetStatus('reactivate', { hasOwner: true })).toBe('ACTIVE');
    expect(targetStatus('reactivate', { hasOwner: false })).toBe('UNASSIGNED');
  });

  it('offers the right actions per status', () => {
    expect(availableActions('UNASSIGNED')).toEqual(['markLost']);
    expect(availableActions('ACTIVE')).toEqual(['suspend', 'deactivate', 'markLost']);
    expect(availableActions('SUSPENDED')).toEqual(['deactivate', 'reactivate', 'markLost']);
    expect(availableActions('LOST')).toEqual(['reactivate']);
    expect(canApply('suspend', 'LOST')).toBe(false);
  });
});
