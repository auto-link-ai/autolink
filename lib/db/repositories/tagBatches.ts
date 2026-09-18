/**
 * Repository: tagBatches
 *
 * SECURITY BOUNDARY — only repositories import models. Admin-only: every
 * function takes an `AdminActor` and writes an audit log entry for mutations.
 * Returned objects never include `_id`.
 *
 * Functions are added in Phase 1 (batch generation).
 */
import 'server-only';

export interface TagBatchDTO {
  label: string;
  quantity: number;
  createdAt: Date;
}
