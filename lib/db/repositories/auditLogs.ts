/**
 * Repository: auditLogs
 *
 * SECURITY BOUNDARY — only repositories import models. Append-only: there is
 * no update or delete. Entries are written by other repositories inside admin
 * mutations (AdminActor) or by system jobs (SystemActor). A MESSAGE_BODY_VIEW
 * entry must carry a non-empty reason.
 */
import 'server-only';
import type { ClientSession } from 'mongoose';
import { AuditLogModel } from '@/lib/db/models/auditLog';
import type { AdminActor, SystemActor } from './actor';
import { toObjectId } from './objectId';

export interface AuditEntryInput {
  action: string;
  targetType: string;
  targetId: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

export const auditLogsRepository = {
  /** Call inside the same transaction session as the change it records, when there is one. */
  async append(
    actor: AdminActor | SystemActor,
    entry: AuditEntryInput,
    session?: ClientSession,
  ): Promise<void> {
    const reason = entry.reason?.trim() || null;
    if (entry.action === 'MESSAGE_BODY_VIEW' && !reason) {
      throw new Error('MESSAGE_BODY_VIEW requires a reason.');
    }
    await AuditLogModel.create(
      [
        {
          actorType: actor.kind === 'admin' ? 'ADMIN' : 'SYSTEM',
          actorId: actor.kind === 'admin' ? toObjectId(actor.adminId) : null,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          reason,
          metadata: entry.metadata ?? {},
        },
      ],
      { session },
    );
  },
};
