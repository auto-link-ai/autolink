import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  NOTIFICATION_ATTEMPT_STATUSES,
  NOTIFICATION_CHANNELS,
  type NotificationAttemptStatus,
  type NotificationChannel,
} from '@/lib/domain/constants';

export interface NotificationAttempt {
  messageId: Types.ObjectId;
  channel: NotificationChannel;
  status: NotificationAttemptStatus;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationAttemptSchema = new Schema<NotificationAttempt>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    status: { type: String, enum: NOTIFICATION_ATTEMPT_STATUSES, required: true },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'notificationAttempts' },
);

export const NotificationAttemptModel: Model<NotificationAttempt> =
  (models.NotificationAttempt as Model<NotificationAttempt> | undefined) ??
  model<NotificationAttempt>('NotificationAttempt', notificationAttemptSchema);
