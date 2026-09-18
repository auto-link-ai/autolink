/**
 * Repository: auditLogs
 *
 * SECURITY BOUNDARY — only repositories import models. Append-only: there is
 * no update or delete. Entries are written by other repositories inside admin
 * mutations (AdminActor) or by system jobs (SystemActor). A MESSAGE_BODY_VIEW
 * entry must carry a non-empty reason.
 *
 * Functions are added in Phase 1 (batch creation, tag status changes).
 */
import 'server-only';

export interface AuditEntryInput {
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}
