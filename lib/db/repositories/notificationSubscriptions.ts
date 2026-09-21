/**
 * Repository: notificationSubscriptions (web push)
 *
 * SECURITY BOUNDARY — only repositories import models. A subscription belongs
 * to one owner: it is stored against `actor.userId` and only ever read by
 * resolving the owner of a message, so one account can never push to another's
 * devices. Endpoints and keys never leave the server.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationSubscriptionModel } from '@/lib/db/models/notificationSubscription';
import type { OwnerActor, SystemActor } from './actor';
import { toObjectId } from './objectId';

/** What `web-push` needs to reach one device. */
export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const notificationSubscriptionsRepository = {
  /** Idempotent: the same browser re-subscribing updates its keys. */
  async save(owner: OwnerActor, target: PushTarget): Promise<{ ok: boolean }> {
    const userId = toObjectId(owner.userId);
    if (!userId) return { ok: false };
    await connectToDatabase();
    await NotificationSubscriptionModel.updateOne(
      { endpoint: target.endpoint },
      {
        $set: {
          userId,
          p256dh: target.keys.p256dh,
          auth: target.keys.auth,
          isActive: true,
          failureCount: 0,
        },
      },
      { upsert: true },
    );
    return { ok: true };
  },

  async remove(owner: OwnerActor, endpoint: string): Promise<{ ok: boolean }> {
    const userId = toObjectId(owner.userId);
    if (!userId) return { ok: false };
    await connectToDatabase();
    const result = await NotificationSubscriptionModel.deleteOne({ endpoint, userId });
    return { ok: result.deletedCount === 1 };
  },

  async countForOwner(owner: OwnerActor): Promise<number> {
    const userId = toObjectId(owner.userId);
    if (!userId) return 0;
    await connectToDatabase();
    return NotificationSubscriptionModel.countDocuments({ userId, isActive: true });
  },

  /**
   * The devices to notify about one message. The owner is resolved from the
   * message itself, so no caller ever passes an owner id around.
   */
  async listForMessage(messagePublicId: string): Promise<PushTarget[]> {
    await connectToDatabase();
    const message = await MessageModel.findOne({ publicId: messagePublicId }, { ownerId: 1 }).lean();
    if (!message) return [];

    const subscriptions = await NotificationSubscriptionModel.find(
      { userId: message.ownerId, isActive: true },
      { endpoint: 1, p256dh: 1, auth: 1 },
    ).lean();
    return subscriptions.map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }));
  },

  /** SYSTEM ONLY (the daily car book reminders): every live device of one account. */
  async listForUser(_system: SystemActor, userId: string): Promise<PushTarget[]> {
    const id = toObjectId(userId);
    if (!id) return [];
    await connectToDatabase();
    const subscriptions = await NotificationSubscriptionModel.find(
      { userId: id, isActive: true },
      { endpoint: 1, p256dh: 1, auth: 1 },
    ).lean();
    return subscriptions.map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }));
  },

  /**
   * A device that answered 404 or 410 is gone for good: stop pushing to it.
   * Anything else counts as a wobble until it has failed often enough.
   */
  async recordFailure(endpoint: string, gone: boolean): Promise<void> {
    await connectToDatabase();
    if (gone) {
      await NotificationSubscriptionModel.updateOne({ endpoint }, { $set: { isActive: false } });
      return;
    }
    await NotificationSubscriptionModel.updateOne({ endpoint }, { $inc: { failureCount: 1 } });
    await NotificationSubscriptionModel.updateOne(
      { endpoint, failureCount: { $gte: 5 } },
      { $set: { isActive: false } },
    );
  },

  async recordSuccess(endpoint: string): Promise<void> {
    await connectToDatabase();
    await NotificationSubscriptionModel.updateOne(
      { endpoint },
      { $set: { lastUsedAt: new Date(), failureCount: 0 } },
    );
  },
};
