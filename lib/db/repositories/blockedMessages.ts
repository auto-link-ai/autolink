/**
 * Repository: blockedMessages (messages stopped for abusive words)
 *
 * SECURITY BOUNDARY — only repositories import models. Written by a scanner
 * whose message was stopped; read, removed or delivered by an admin only.
 * Owners never see an entry unless an admin delivers it.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { BlockedMessageModel } from '@/lib/db/models/blockedMessage';
import { MessageModel } from '@/lib/db/models/message';
import { TagModel } from '@/lib/db/models/tag';
import { isLocale, defaultLocale } from '@/i18n/locales';
import { MESSAGE_CATEGORIES, type MessageCategory } from '@/lib/domain/constants';
import { generateBlockedMessageId, generateMessagePublicId } from '@/lib/tags/generate';
import type { AdminActor, ScannerActor } from './actor';
import { auditLogsRepository } from './auditLogs';

const DAY_MS = 24 * 60 * 60 * 1000;

function toCategory(value: string): MessageCategory {
  return (MESSAGE_CATEGORIES as readonly string[]).includes(value) ? (value as MessageCategory) : 'OTHER';
}

export interface NewBlockedMessage {
  publicTagId: string;
  category: string;
  body: string;
  scannerContact: string | null;
  reason: string;
  locale: string;
  retentionDays: number;
}

/** What the admin list shows. No database id, no IP hash, no session id. */
export interface BlockedMessageDTO {
  /** Null on the first few, made before public ids existed: those can only expire. */
  publicId: string | null;
  publicTagId: string;
  category: string;
  body: string;
  scannerContact: string | null;
  reason: string;
  locale: string;
  createdAt: Date;
}

export type DeliverResult =
  | { ok: true; messagePublicId: string }
  | { ok: false; reason: 'not_found' | 'unavailable' };

export const blockedMessagesRepository = {
  async record(scanner: ScannerActor, input: NewBlockedMessage): Promise<void> {
    await connectToDatabase();
    await BlockedMessageModel.create({
      ...input,
      publicId: generateBlockedMessageId(),
      ipHash: scanner.ipHash,
      scannerSessionId: scanner.scannerSessionId,
      expiresAt: new Date(Date.now() + input.retentionDays * DAY_MS),
    });
  },

  /** Newest first. */
  async listForAdmin(_admin: AdminActor, limit = 100): Promise<BlockedMessageDTO[]> {
    await connectToDatabase();
    const rows = await BlockedMessageModel.find(
      {},
      { _id: 0, publicId: 1, publicTagId: 1, category: 1, body: 1, scannerContact: 1, reason: 1, locale: 1, createdAt: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return rows.map((row) => ({
      publicId: row.publicId ?? null,
      publicTagId: row.publicTagId,
      category: row.category,
      body: row.body,
      scannerContact: row.scannerContact ?? null,
      reason: row.reason,
      locale: row.locale,
      createdAt: row.createdAt,
    }));
  },

  /** Removes an entry from the list. */
  async remove(admin: AdminActor, publicId: string): Promise<{ ok: boolean }> {
    const mongoose = await connectToDatabase();
    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      applied = (await BlockedMessageModel.deleteOne({ publicId }, { session })).deletedCount === 1;
      if (!applied) return;
      await auditLogsRepository.append(
        admin,
        { action: 'BLOCKED_MESSAGE_DELETE', targetType: 'blockedMessage', targetId: publicId },
        session,
      );
    });
    return { ok: applied };
  },

  /**
   * Gemini was wrong: the entry becomes an ordinary message to the sticker's
   * current owner, as if it had gone through. Only while that sticker is active;
   * the caller then notifies the owner as usual.
   */
  async deliver(admin: AdminActor, publicId: string, retentionDays: number): Promise<DeliverResult> {
    const mongoose = await connectToDatabase();
    const entry = await BlockedMessageModel.findOne({ publicId }).lean();
    if (!entry) return { ok: false, reason: 'not_found' };
    const tag = await TagModel.findOne(
      { publicTagId: entry.publicTagId, status: 'ACTIVE' },
      { _id: 1, ownerId: 1, vehicleId: 1 },
    ).lean();
    if (!tag?.ownerId || !tag.vehicleId) return { ok: false, reason: 'unavailable' };
    const { ownerId, vehicleId } = tag;

    const messagePublicId = generateMessagePublicId();
    let applied = false;
    await mongoose.connection.transaction(async (session) => {
      applied = (await BlockedMessageModel.deleteOne({ _id: entry._id }, { session })).deletedCount === 1;
      if (!applied) return;
      await MessageModel.create(
        [
          {
            publicId: messagePublicId,
            vehicleId,
            tagId: tag._id,
            ownerId,
            category: toCategory(entry.category),
            body: entry.body,
            scannerContact: entry.scannerContact ?? null,
            scannerSessionId: entry.scannerSessionId ?? 'admin-delivered',
            ipHash: entry.ipHash,
            locale: isLocale(entry.locale) ? entry.locale : defaultLocale,
            expiresAt: new Date(Date.now() + retentionDays * DAY_MS),
          },
        ],
        { session },
      );
      await auditLogsRepository.append(
        admin,
        { action: 'BLOCKED_MESSAGE_DELIVER', targetType: 'blockedMessage', targetId: publicId, metadata: { messagePublicId } },
        session,
      );
    });
    return applied ? { ok: true, messagePublicId } : { ok: false, reason: 'not_found' };
  },
};
