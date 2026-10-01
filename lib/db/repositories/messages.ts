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
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { MessageModel } from '@/lib/db/models/message';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel } from '@/lib/db/models/vehicle';
import type { Locale } from '@/i18n/locales';
import type { MessageCategory, MessageStatus } from '@/lib/domain/constants';
import { generateMessagePublicId } from '@/lib/tags/generate';
import { isValidTagIdShape } from '@/lib/validation/tagId';
import type { OwnerActor, ScannerActor } from './actor';
import { toObjectId } from './objectId';
import { carLabel } from '@/lib/vehicles/carName';

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
  /** Which sticker it came through, and the car it was about. */
  publicTagId: string;
  vehicleLabel: string | null;
}

export interface NewMessage {
  publicTagId: string;
  category: MessageCategory;
  body: string;
  scannerContact: string | null;
  locale: Locale;
  retentionDays: number;
}

export type CreateMessageResult =
  | { ok: true; publicId: string }
  | { ok: false; reason: 'unavailable' };

/** Admin list view — no body, no scanner contact. */
export interface AdminMessageMeta {
  publicId: string;
  publicTagId: string;
  category: MessageCategory;
  status: MessageStatus;
  createdAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function vehicleLabel(vehicle: { brand: string; model: string; color: string } | null): string | null {
  return vehicle ? carLabel(vehicle) : null;
}

export const messagesRepository = {
  /**
   * A message from someone who scanned a sticker. The tag is resolved here and
   * must still be ACTIVE; owner, vehicle and tag ids are copied from it, never
   * from the form. A tag that is not available answers `unavailable`, which the
   * page shows as the same generic state as an unknown sticker (rule 9).
   */
  async create(scanner: ScannerActor, input: NewMessage): Promise<CreateMessageResult> {
    if (!isValidTagIdShape(input.publicTagId)) return { ok: false, reason: 'unavailable' };
    await connectToDatabase();

    const tag = await TagModel.findOne(
      { publicTagId: input.publicTagId, status: 'ACTIVE' },
      { _id: 1, ownerId: 1, vehicleId: 1 },
    ).lean();
    if (!tag?.ownerId || !tag.vehicleId) return { ok: false, reason: 'unavailable' };

    const publicId = generateMessagePublicId();
    await MessageModel.create({
      publicId,
      vehicleId: tag.vehicleId,
      tagId: tag._id,
      ownerId: tag.ownerId,
      category: input.category,
      body: input.body,
      scannerContact: input.scannerContact,
      scannerSessionId: scanner.scannerSessionId,
      ipHash: scanner.ipHash,
      locale: input.locale,
      expiresAt: new Date(Date.now() + input.retentionDays * DAY_MS),
    });
    return { ok: true, publicId };
  },

  /**
   * What a notification may say: which car, what kind of problem, in the
   * owner's language. Never the body — a lock screen is a public place.
   */
  async findForNotification(
    publicId: string,
  ): Promise<{ category: MessageCategory; vehicleLabel: string | null; locale: Locale } | null> {
    await connectToDatabase();
    const message = await MessageModel.findOne({ publicId }, { category: 1, vehicleId: 1, ownerId: 1 }).lean();
    if (!message) return null;

    const [vehicle, owner] = await Promise.all([
      VehicleModel.findById(message.vehicleId, { brand: 1, model: 1, color: 1 }).lean(),
      UserModel.findById(message.ownerId, { locale: 1 }).lean(),
    ]);
    return {
      category: message.category,
      vehicleLabel: vehicleLabel(vehicle ?? null),
      locale: owner?.locale ?? 'fr',
    };
  },

  /** The owner's inbox: their messages only, newest first. */
  async listForOwner(owner: OwnerActor, limit = 50): Promise<MessageDTO[]> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return [];
    await connectToDatabase();

    const messages = await MessageModel.find({ ownerId, status: { $ne: 'ARCHIVED' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    if (messages.length === 0) return [];

    // One lookup each for the labels, rather than a join per message.
    const [tags, vehicles] = await Promise.all([
      TagModel.find({ _id: { $in: messages.map((m) => m.tagId) } }, { publicTagId: 1 }).lean(),
      VehicleModel.find(
        { _id: { $in: messages.map((m) => m.vehicleId) }, ownerId },
        { brand: 1, model: 1, color: 1 },
      ).lean(),
    ]);
    const tagById = new Map(tags.map((tag) => [tag._id.toString(), tag.publicTagId]));
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));

    return messages.map((message) => ({
      publicId: message.publicId,
      category: message.category,
      body: message.body,
      scannerContact: message.scannerContact,
      status: message.status,
      locale: message.locale,
      createdAt: message.createdAt,
      readAt: message.readAt,
      publicTagId: tagById.get(message.tagId.toString()) ?? '',
      vehicleLabel: vehicleLabel(vehicleById.get(message.vehicleId.toString()) ?? null),
    }));
  },

  /** How many messages wait unread — the badge in the site header. */
  async countUnread(owner: OwnerActor): Promise<number> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return 0;
    await connectToDatabase();
    return MessageModel.countDocuments({ ownerId, status: 'UNREAD' });
  },

  /** Unread messages per sticker, for the badges on the dashboard. */
  async unreadByTag(owner: OwnerActor): Promise<Map<string, number>> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return new Map();
    await connectToDatabase();

    const rows = await MessageModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { ownerId, status: 'UNREAD' } },
      { $group: { _id: '$tagId', count: { $sum: 1 } } },
      { $lookup: { from: 'tags', localField: '_id', foreignField: '_id', as: 'tag' } },
      { $project: { _id: { $first: '$tag.publicTagId' }, count: 1 } },
    ]);
    return new Map(rows.filter((row) => typeof row._id === 'string').map((row) => [row._id as string, row.count]));
  },

  /**
   * Mark read or archive. Filtered by `ownerId`, so another account's message
   * simply does not exist.
   */
  async setStatus(owner: OwnerActor, publicId: string, status: MessageStatus): Promise<{ ok: boolean }> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return { ok: false };
    await connectToDatabase();
    const result = await MessageModel.updateOne(
      { publicId, ownerId },
      { $set: { status, readAt: status === 'UNREAD' ? null : new Date() } },
    );
    return { ok: result.matchedCount === 1 };
  },
};
