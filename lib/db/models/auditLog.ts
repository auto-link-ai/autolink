import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { AUDIT_ACTOR_TYPES, type AuditActorType } from '@/lib/domain/constants';

export interface AuditLog {
  actorType: AuditActorType;
  actorId: Types.ObjectId | null;
  /** e.g. 'TAG_BATCH_CREATE', 'MESSAGE_BODY_VIEW'. */
  action: string;
  targetType: string;
  targetId: string;
  /** Required for MESSAGE_BODY_VIEW (enforced in the repository). */
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    actorType: { type: String, enum: AUDIT_ACTOR_TYPES, required: true },
    actorId: { type: Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    reason: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'auditLogs', minimize: false },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel: Model<AuditLog> =
  (models.AuditLog as Model<AuditLog> | undefined) ?? model<AuditLog>('AuditLog', auditLogSchema);
