/**
 * Repository: messages
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch MessageModel.
 * - Creation takes a `ScannerActor` and a tag that was resolved server-side;
 *   the owner/vehicle ids are copied from that tag, never from request input.
 * - Owner reads/updates take an `OwnerActor` and filter by `ownerId: actor.userId`
 *   plus the message `publicId`.
 * - Admin list returns metadata only (`AdminMessageMeta`). The body is revealed
 *   one message at a time, with a required reason that writes a
 *   MESSAGE_BODY_VIEW audit entry.
 * Returned objects never include `_id`, `ipHash`, or `scannerSessionId`.
 *
 * Functions are added in Phase 2 (create) and Phase 5 (dashboard).
 */
import 'server-only';
import type { Locale } from '@/i18n/locales';
import type { MessageCategory, MessageStatus } from '@/lib/domain/constants';

/** Owner's view of a message. */
export interface MessageDTO {
  publicId: string;
  category: MessageCategory;
  body: string;
  scannerContact: string | null;
  status: MessageStatus;
  locale: Locale;
  createdAt: Date;
  readAt: Date | null;
}

/** Admin list view — no body, no scanner contact. */
export interface AdminMessageMeta {
  publicId: string;
  publicTagId: string;
  category: MessageCategory;
  status: MessageStatus;
  createdAt: Date;
}
