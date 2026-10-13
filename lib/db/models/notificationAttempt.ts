import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  NOTIFICATION_ATTEMPT_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PURPOSES,
  type NotificationAttemptStatus,
  type NotificationChannel,
  type NotificationPurpose,
} from '@/lib/domain/constants';

/**
 * One notification that went out, or tried to: a scanner message's alert, a
 * car book reminder, or a WhatsApp verification code. The outcome only —
 * never what was said.
 */
export interface NotificationAttempt {
  purpose: NotificationPurpose;
  /** The message alerted about (MESSAGE only). */
  messageId: Types.ObjectId | null;
  /** The account it was for; none for a code sent before the account exists. */
  userId: Types.ObjectId | null;
  channel: NotificationChannel;
  status: NotificationAttemptStatus;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationAttemptSchema = new Schema<NotificationAttempt>(
  {
    purpose: { type: String, enum: NOTIFICATION_PURPOSES, default: 'MESSAGE' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    status: { type: String, enum: NOTIFICATION_ATTEMPT_STATUSES, required: true },
    error: { type: String, default: null },
  },
  { timestamps: true, collection: 'notificationAttempts' },
);

// The admin's counts: what went out today and this week.
notificationAttemptSchema.index({ createdAt: -1 });

export const NotificationAttemptModel: Model<NotificationAttempt> =
  (models.NotificationAttempt as Model<NotificationAttempt> | undefined) ??
  model<NotificationAttempt>('NotificationAttempt', notificationAttemptSchema);
