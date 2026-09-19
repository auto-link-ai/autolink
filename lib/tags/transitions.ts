import { TAG_ACTIONS, type TagAction, type TagStatus } from '@/lib/domain/constants';

/**
 * Admin status changes. Each action lists the statuses it may start from; the
 * repository puts that list in its update filter, so a concurrent change can
 * never skip this table.
 */
const ALLOWED_FROM: Readonly<Record<TagAction, readonly TagStatus[]>> = {
  suspend: ['ACTIVE'],
  deactivate: ['ACTIVE', 'SUSPENDED'],
  markLost: ['UNASSIGNED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
  reactivate: ['SUSPENDED', 'DEACTIVATED', 'LOST'],
};

export function allowedFrom(action: TagAction): readonly TagStatus[] {
  return ALLOWED_FROM[action];
}

export function canApply(action: TagAction, status: TagStatus): boolean {
  return ALLOWED_FROM[action].includes(status);
}

/**
 * Where an action leads. Reactivation returns a tag to ACTIVE only if it is
 * bound to an owner and vehicle; otherwise it goes back to UNASSIGNED.
 */
export function targetStatus(action: TagAction, tag: { hasOwner: boolean }): TagStatus {
  switch (action) {
    case 'suspend':
      return 'SUSPENDED';
    case 'deactivate':
      return 'DEACTIVATED';
    case 'markLost':
      return 'LOST';
    case 'reactivate':
      return tag.hasOwner ? 'ACTIVE' : 'UNASSIGNED';
  }
}

/** Actions to offer in the UI for a tag in `status`, in canonical order. */
export function availableActions(status: TagStatus): TagAction[] {
  return TAG_ACTIONS.filter((action) => canApply(action, status));
}
