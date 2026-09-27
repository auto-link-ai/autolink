/**
 * Repository: maintenance (index management, verification checks)
 *
 * SECURITY BOUNDARY — only repositories import models. Called by scripts only;
 * never exposed through a route.
 */
import 'server-only';
import type { Model } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { AdminUserModel } from '@/lib/db/models/adminUser';
import { ApiUsageModel } from '@/lib/db/models/apiUsage';
import { AuditLogModel } from '@/lib/db/models/auditLog';
import { BlockedMessageModel } from '@/lib/db/models/blockedMessage';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import { NotificationSubscriptionModel } from '@/lib/db/models/notificationSubscription';
import { OrderModel } from '@/lib/db/models/order';
import { RateLimitModel } from '@/lib/db/models/rateLimit';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
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
  BlockedMessageModel,
  NotificationSubscriptionModel,
  NotificationAttemptModel,
  OrderModel,
  AdminUserModel,
  AuditLogModel,
  RateLimitModel,
  ApiUsageModel,
  ServiceRecordModel,
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

/**
 * Verification for the Phase 1 gate: searches EVERY collection for any of the
 * given strings (e.g. plaintext activation codes from a tags.csv). Returns the
 * number of matching documents per collection; an empty result means none leaked.
 */
export async function findStringOccurrences(needles: string[]): Promise<Record<string, number>> {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db || needles.length === 0) return {};
  const hits: Record<string, number> = {};
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    for await (const doc of db.collection(name).find({})) {
      const text = JSON.stringify(doc);
      if (needles.some((needle) => text.includes(needle))) hits[name] = (hits[name] ?? 0) + 1;
    }
  }
  return hits;
}

/** For the same check: how many of these tags store an argon2id hash. */
export async function countArgon2idHashes(
  publicTagIds: string[],
): Promise<{ found: number; argon2id: number }> {
  await connectToDatabase();
  const docs = await TagModel.find({ publicTagId: { $in: publicTagIds } }, { activationCodeHash: 1 })
    .select('+activationCodeHash')
    .lean();
  return {
    found: docs.length,
    argon2id: docs.filter((d) => d.activationCodeHash.startsWith('$argon2id$')).length,
  };
}
