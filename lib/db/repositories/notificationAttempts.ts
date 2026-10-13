/**
 * Repository: notificationAttempts
 *
 * SECURITY BOUNDARY — only repositories import models. Append-only record of
 * what was sent and what came back, so "I was never told" has an answer. It
 * stores the outcome, never the message body, the code or the number.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import type { NotificationAttemptStatus, NotificationChannel } from '@/lib/domain/constants';
import type { SystemActor } from './actor';
import { toObjectId } from './objectId';

// Trimmed: a provider error can be long, and it is only a breadcrumb.
const trimmed = (error: string | null) => (error ? error.slice(0, 200) : null);

export const notificationAttemptsRepository = {
  /** A scanner message's alert. Kept against the message and its owner. */
  async record(
    messagePublicId: string,
    channel: NotificationChannel,
    status: NotificationAttemptStatus,
    error: string | null = null,
  ): Promise<void> {
    await connectToDatabase();
    const message = await MessageModel.findOne({ publicId: messagePublicId }, { _id: 1, ownerId: 1 }).lean();
    if (!message) return;
    await NotificationAttemptModel.create({
      purpose: 'MESSAGE',
      messageId: message._id,
      userId: message.ownerId,
      channel,
      status,
      error: trimmed(error),
    });
  },

  /** SYSTEM ONLY: a car book reminder (for an account) or a verification code (maybe before one exists). */
  async recordOther(
    _system: SystemActor,
    input: {
      purpose: 'REMINDER' | 'CODE';
      userId: string | null;
      channel: NotificationChannel;
      status: NotificationAttemptStatus;
      error?: string | null;
    },
  ): Promise<void> {
    await connectToDatabase();
    await NotificationAttemptModel.create({
      purpose: input.purpose,
      messageId: null,
      userId: input.userId ? toObjectId(input.userId) : null,
      channel: input.channel,
      status: input.status,
      error: trimmed(input.error ?? null),
    });
  },
};
