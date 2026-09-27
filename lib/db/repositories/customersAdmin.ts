/**
 * Repository: customer accounts — admin additions (add by hand, change email, delete)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `AdminActor`; every change writes its audit entry in the same transaction.
 * The audit log names what changed, never the email or the password.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import { NotificationSubscriptionModel } from '@/lib/db/models/notificationSubscription';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { Locale } from '@/i18n/locales';
import { generatePublicUserId } from '@/lib/tags/generate';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;
}

export interface NewCustomerByAdmin {
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string;
  locale: Locale;
}

export const adminCustomersRepository = {
  /** An account made by hand. The caller shows its temporary password once. */
  async create(
    admin: AdminActor,
    input: NewCustomerByAdmin,
  ): Promise<{ ok: true; publicUserId: string } | { ok: false; reason: 'email_taken' }> {
    const mongoose = await connectToDatabase();
    const publicUserId = generatePublicUserId();
    try {
      await mongoose.connection.transaction(async (session) => {
        await UserModel.create([{ ...input, publicUserId }], { session });
        await auditLogsRepository.append(
          admin,
          { action: 'USER_CREATE_MANUAL', targetType: 'user', targetId: publicUserId },
          session,
        );
      });
      return { ok: true, publicUserId };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { ok: false, reason: 'email_taken' };
      throw error;
    }
  },

  /** A mistyped email. It must stay unique; the account id and sessions are unaffected. */
  async updateEmail(
    admin: AdminActor,
    publicUserId: string,
    email: string,
  ): Promise<{ ok: true; changed: boolean } | { ok: false; reason: 'not_found' | 'email_taken' }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false, reason: 'not_found' };
    const mongoose = await connectToDatabase();
    const user = await UserModel.findOne({ publicUserId }, { _id: 1, email: 1 }).lean();
    if (!user) return { ok: false, reason: 'not_found' };
    if (user.email === email) return { ok: true, changed: false };
    try {
      await mongoose.connection.transaction(async (session) => {
        await UserModel.updateOne({ _id: user._id }, { $set: { email, emailVerifiedAt: null } }, { session, runValidators: true });
        await auditLogsRepository.append(
          admin,
          { action: 'USER_EMAIL_CHANGE', targetType: 'user', targetId: publicUserId },
          session,
        );
      });
      return { ok: true, changed: true };
    } catch (error) {
      if (isDuplicateKeyError(error)) return { ok: false, reason: 'email_taken' };
      throw error;
    }
  },

  /**
   * Deletes an account and everything it owns: its cars and their car books,
   * the messages it received and their delivery attempts, its notification
   * subscriptions. Its stickers go back to unassigned — the activation slip
   * still works for whoever holds it. Orders are kept, for the accounts.
   */
  async remove(admin: AdminActor, publicUserId: string): Promise<{ ok: boolean; stickers?: number }> {
    if (!isValidPublicUserId(publicUserId)) return { ok: false };
    const mongoose = await connectToDatabase();
    const user = await UserModel.findOne({ publicUserId }, { _id: 1 }).lean();
    if (!user) return { ok: false };
    const ownerId = user._id;

    let stickers = 0;
    let cars = 0;
    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      const released = await TagModel.updateMany(
        { ownerId },
        {
          $set: {
            status: 'UNASSIGNED',
            ownerId: null,
            vehicleId: null,
            activatedAt: null,
            activationAttempts: 0,
            lockedUntil: null,
          },
        },
        { session },
      );
      stickers = released.modifiedCount;
      const messageIds = (await MessageModel.find({ ownerId }, { _id: 1 }).session(session).lean()).map((m) => m._id);
      if (messageIds.length > 0) {
        await NotificationAttemptModel.deleteMany({ messageId: { $in: messageIds } }, { session });
      }
      await MessageModel.deleteMany({ ownerId }, { session });
      await ServiceRecordModel.deleteMany({ ownerId }, { session });
      cars = (await VehicleModel.deleteMany({ ownerId }, { session })).deletedCount;
      await NotificationSubscriptionModel.deleteMany({ userId: ownerId }, { session });
      applied = (await UserModel.deleteOne({ _id: ownerId }, { session })).deletedCount === 1;
      if (!applied) return;
      await auditLogsRepository.append(
        admin,
        {
          action: 'USER_DELETE',
          targetType: 'user',
          targetId: publicUserId,
          metadata: { releasedStickers: stickers, deletedCars: cars, deletedMessages: messageIds.length },
        },
        session,
      );
    });
    return applied ? { ok: true, stickers } : { ok: false };
  },
};
