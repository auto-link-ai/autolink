import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface NotificationSubscription {
  userId: Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSubscriptionSchema = new Schema<NotificationSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
    failureCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'notificationSubscriptions' },
);

export const NotificationSubscriptionModel: Model<NotificationSubscription> =
  (models.NotificationSubscription as Model<NotificationSubscription> | undefined) ??
  model<NotificationSubscription>('NotificationSubscription', notificationSubscriptionSchema);
