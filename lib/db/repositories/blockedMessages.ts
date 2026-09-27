/**
 * Repository: blockedMessages (messages stopped for abusive words)
 *
 * SECURITY BOUNDARY — only repositories import models. Written by a scanner
 * whose message was stopped; read by an admin only. Owners never see it.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { BlockedMessageModel } from '@/lib/db/models/blockedMessage';
import type { AdminActor, ScannerActor } from './actor';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NewBlockedMessage {
  publicTagId: string;
  category: string;
  body: string;
  reason: string;
  locale: string;
  retentionDays: number;
}

/** What the admin list shows. No database id, no IP hash. */
export interface BlockedMessageDTO {
  publicTagId: string;
  category: string;
  body: string;
  reason: string;
  locale: string;
  createdAt: Date;
}

export const blockedMessagesRepository = {
  async record(scanner: ScannerActor, input: NewBlockedMessage): Promise<void> {
    await connectToDatabase();
    await BlockedMessageModel.create({
      ...input,
      ipHash: scanner.ipHash,
      expiresAt: new Date(Date.now() + input.retentionDays * DAY_MS),
    });
  },

  /** Newest first. */
  async listForAdmin(_admin: AdminActor, limit = 100): Promise<BlockedMessageDTO[]> {
    await connectToDatabase();
    const rows = await BlockedMessageModel.find({}, { _id: 0, publicTagId: 1, category: 1, body: 1, reason: 1, locale: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return rows.map((row) => ({
      publicTagId: row.publicTagId,
      category: row.category,
      body: row.body,
      reason: row.reason,
      locale: row.locale,
      createdAt: row.createdAt,
    }));
  },
};
