import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { TagStatus } from '@/lib/domain/constants';

const TONE: Record<TagStatus, BadgeTone> = {
  UNASSIGNED: 'neutral',
  ACTIVE: 'success',
  DEACTIVATED: 'neutral',
  SUSPENDED: 'warning',
  LOST: 'danger',
};

export function StatusBadge({ status, label }: { status: TagStatus; label: string }) {
  return <Badge tone={TONE[status]}>{label}</Badge>;
}
