/**
 * Repository: maintenance (index management)
 *
 * SECURITY BOUNDARY — only repositories import models. Called by scripts only;
 * never exposed through a route.
 */
import 'server-only';
import type { Model } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { AdminUserModel } from '@/lib/db/models/adminUser';
import { AuditLogModel } from '@/lib/db/models/auditLog';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import { NotificationSubscriptionModel } from '@/lib/db/models/notificationSubscription';
import { OrderModel } from '@/lib/db/models/order';
import { RateLimitModel } from '@/lib/db/models/rateLimit';
import { SettingModel } from '@/lib/db/models/setting';
import { TagModel } from '@/lib/db/models/tag';
import { TagBatchModel } from '@/lib/db/models/tagBatch';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import { WilayaModel } from '@/lib/db/models/wilaya';

const ALL_MODELS: ReadonlyArray<Pick<Model<unknown>, 'syncIndexes' | 'collection'>> = [
  UserModel,
  VehicleModel,
  TagModel,
  TagBatchModel,
  MessageModel,
  NotificationSubscriptionModel,
  NotificationAttemptModel,
  OrderModel,
  AdminUserModel,
  AuditLogModel,
  RateLimitModel,
  SettingModel,
  WilayaModel,
];

/**
 * Makes every collection's indexes match the schemas (creates missing ones,
 * drops ones no longer declared). Production connects with autoIndex off, so
 * this is how indexes — including the TTL indexes — get built there.
 */
export async function syncAllIndexes(): Promise<string[]> {
  await connectToDatabase();
  const synced: string[] = [];
  for (const m of ALL_MODELS) {
    await m.syncIndexes();
    synced.push(m.collection.collectionName);
  }
  return synced;
}
