/**
 * Repository: notificationAttempts
 *
 * SECURITY BOUNDARY — only repositories import models. Written by the delivery
 * pipeline (SystemActor) for every push/email attempt. Not exposed to owners
 * or scanners.
 *
 * Functions are added in Phase 4 (notifications).
 */
import 'server-only';
import type { NotificationAttemptStatus, NotificationChannel } from '@/lib/domain/constants';

export interface NotificationAttemptRecord {
  channel: NotificationChannel;
  status: NotificationAttemptStatus;
  error: string | null;
}
