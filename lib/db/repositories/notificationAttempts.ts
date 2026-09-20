/**
 * Repository: notificationAttempts
 *
 * SECURITY BOUNDARY — only repositories import models. Append-only record of
 * what was sent and what came back, so "I never got told" has an answer. It
 * stores the outcome, never the message body.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { NotificationAttemptModel } from '@/lib/db/models/notificationAttempt';
import type { NotificationAttemptStatus, NotificationChannel } from '@/lib/domain/constants';

export const notificationAttemptsRepository = {
  async record(
    messagePublicId: string,
    channel: NotificationChannel,
    status: NotificationAttemptStatus,
    error: string | null = null,
  ): Promise<void> {
    await connectToDatabase();
    const message = await MessageModel.findOne({ publicId: messagePublicId }, { _id: 1 }).lean();
    if (!message) return;
    await NotificationAttemptModel.create({
      messageId: message._id,
      channel,
      status,
      // Trimmed: a provider error can be long, and it is only a breadcrumb.
      error: error ? error.slice(0, 200) : null,
    });
  },
};
