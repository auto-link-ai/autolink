/**
 * Repository: customer accounts — admin changes (block, correct, PIN, delete)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor` (or the purge script's `SystemActor`) and addresses an account
 * by its publicUserId; every change writes an audit entry. The audit log names
 * what changed, never the phone or the PIN. Reads are in customersAdminQueries.ts.
 */
import 'server-only';
import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import { NotificationSubscriptionModel } from '@/lib/db/models/notificationSubscription';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { UserStatus } from '@/lib/domain/constants';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { AdminActor, SystemActor } from './actor';
import { auditLogsRepository } from './auditLogs';

function isDuplicatePhone(error: unknown): boolean {
  const e = error as { code?: unknown; keyPattern?: Record<string, unknown> } | null;
  return Boolean(e && e.code === 11000 && e.keyPattern && 'phone' in e.keyPattern);
}

export const adminCustomersRepository = {
  /**
   * Blocks or unblocks an account. A blocked owner cannot sign in, and an
   * existing session stops working on its next request — `getOwnerSession`
   * re-reads the account every time.
   */
  async setStatus(admin: AdminActor, publicUserId: string, status: UserStatus): Promise<{ ok: boolean }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const result = await UserModel.updateOne({ publicUserId }, { $set: { status } });
    if (result.matchedCount !== 1) return { ok: false };
    await auditLogsRepository.append(admin, {
      action: status === 'BLOCKED' ? 'USER_BLOCK' : 'USER_UNBLOCK',
      targetType: 'user',
      targetId: publicUserId,
    });
    return { ok: true };
  },

  /**
   * Support correcting a name, or moving an owner to a new number after
   * checking it is them (the self-service way is gone: the phone is the
   * sign-in). The number must stay unique.
   */
  async updateContact(
    admin: AdminActor,
    publicUserId: string,
    patch: { firstName: string; lastName: string; phone: string },
  ): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'phone_taken' }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false, reason: 'not_found' };
    await connectToDatabase();
    try {
      const result = await UserModel.updateOne({ publicUserId }, { $set: patch }, { runValidators: true });
      if (result.matchedCount !== 1) return { ok: false, reason: 'not_found' };
    } catch (error) {
      if (isDuplicatePhone(error)) return { ok: false, reason: 'phone_taken' };
      throw error;
    }
    await auditLogsRepository.append(admin, {
      action: 'USER_CONTACT_UPDATE',
      targetType: 'user',
      targetId: publicUserId,
      // The values themselves stay out of the log; the account already holds them.
      metadata: { fields: Object.keys(patch) },
    });
    return { ok: true };
  },

  /**
   * An admin-issued PIN (the plaintext is shown once, never stored): the hash
   * is replaced and the session version moves on, signing every device out.
   * Returns what lib/admin/customerPins.ts needs to let go of the rest.
   */
  async setTemporaryPin(
    admin: AdminActor,
    publicUserId: string,
    pinHash: string,
  ): Promise<{ ok: true; userId: string; phone: string } | { ok: false }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const doc = await UserModel.findOne({ publicUserId }, { phone: 1 }).lean();
    if (!doc) return { ok: false };
    const result = await UserModel.updateOne({ _id: doc._id }, { $set: { pinHash }, $inc: { sessionVersion: 1 } });
    if (result.matchedCount !== 1) return { ok: false };
    await auditLogsRepository.append(admin, { action: 'USER_PIN_RESET', targetType: 'user', targetId: publicUserId });
    return { ok: true, userId: doc._id.toString(), phone: doc.phone };
  },

  /** Records that support cleared the PIN tries of an account (the counters live in rateLimits). */
  async recordPinUnlock(admin: AdminActor, publicUserId: string): Promise<void> {
    await auditLogsRepository.append(admin, { action: 'USER_PIN_UNLOCK', targetType: 'user', targetId: publicUserId });
  },

  /**
   * Deletes an account and everything it owns: its cars and their car books,
   * the messages it received and their delivery attempts, its notification
   * subscriptions. Its stickers go back to unassigned, ready to be activated
   * again by whoever holds them. Orders are kept, for the accounts.
   */
  async remove(admin: AdminActor, publicUserId: string): Promise<{ ok: boolean; stickers?: number }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    await connectToDatabase();
    const user = await UserModel.findOne({ publicUserId }, { _id: 1 }).lean();
    if (!user) return { ok: false };
    return deleteOwner(admin, user._id, publicUserId);
  },

  /**
   * SYSTEM ONLY (`pnpm owners:purge-legacy`): accounts from before phone + PIN
   * sign-in, which can no longer sign in at all. Counts them, and with
   * `apply` deletes each one exactly as `remove` does.
   */
  async purgeWithoutPin(system: SystemActor, apply: boolean): Promise<{ accounts: number; stickers: number }> {
    await connectToDatabase();
    const legacy = await UserModel.find({ pinHash: { $exists: false } }, { _id: 1, publicUserId: 1 }).lean();
    let stickers = 0;
    for (const user of legacy) {
      if (!apply) {
        stickers += await TagModel.countDocuments({ ownerId: user._id });
        continue;
      }
      stickers += (await deleteOwner(system, user._id, user.publicUserId ?? user._id.toString())).stickers ?? 0;
    }
    return { accounts: legacy.length, stickers };
  },
};

/** One transaction: release the stickers, delete everything the account owns, then the account. */
async function deleteOwner(
  actor: AdminActor | SystemActor,
  ownerId: Types.ObjectId,
  targetId: string,
): Promise<{ ok: boolean; stickers?: number }> {
  const mongoose = await connectToDatabase();
  let stickers = 0;
  let applied = false;
  await mongoose.connection.transaction(async (session) => {
    // The callback may run again on a transient error: start from zero each time.
    stickers = 0;
    applied = false;
    const released = await TagModel.updateMany(
      { ownerId },
      { $set: { status: 'UNASSIGNED', ownerId: null, vehicleId: null, activatedAt: null } },
      { session },
    );
    stickers = released.modifiedCount;
    const messageIds = (await MessageModel.find({ ownerId }, { _id: 1 }).session(session).lean()).map((m) => m._id);
    // Attempts kept against its messages, and those kept against the account (reminders).
    await NotificationAttemptModel.deleteMany(
      { $or: [{ messageId: { $in: messageIds } }, { userId: ownerId }] },
      { session },
    );
    await MessageModel.deleteMany({ ownerId }, { session });
    await ServiceRecordModel.deleteMany({ ownerId }, { session });
    const cars = (await VehicleModel.deleteMany({ ownerId }, { session })).deletedCount;
    await NotificationSubscriptionModel.deleteMany({ userId: ownerId }, { session });
    applied = (await UserModel.deleteOne({ _id: ownerId }, { session })).deletedCount === 1;
    if (!applied) return;
    await auditLogsRepository.append(
      actor,
      {
        action: 'USER_DELETE',
        targetType: 'user',
        targetId,
        metadata: { releasedStickers: stickers, deletedCars: cars, deletedMessages: messageIds.length },
      },
      session,
    );
  });
  return applied ? { ok: true, stickers } : { ok: false };
}
