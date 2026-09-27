import { describe, expect, it } from 'vitest';
import { TAG_STATUSES } from '@/lib/domain/constants';
import { canDeleteTag, canTakeBackTag } from '@/lib/tags/adminRules';

describe('deleting a sticker', () => {
  it('is only for a sticker never used and not promised to an order', () => {
    expect(TAG_STATUSES.filter((status) => canDeleteTag({ status, onOrder: false }))).toEqual(['UNASSIGNED']);
    expect(canDeleteTag({ status: 'UNASSIGNED', onOrder: true })).toBe(false);
  });
});

describe('taking a sticker back', () => {
  it('is for a sticker a customer holds', () => {
    expect(canTakeBackTag({ hasOwner: true })).toBe(true);
    expect(canTakeBackTag({ hasOwner: false })).toBe(false);
  });
});
