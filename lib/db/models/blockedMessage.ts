import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';

/**
 * A message stopped for abusive words, kept for the admin to review. Its own
 * collection, never the owner's `messages`: no inbox query can reach it.
 */
export interface BlockedMessage {
  /** 'BLK-' + 10 characters: the admin's handle. Absent on the first few, made before it existed. */
  publicId?: string;
  /** As typed in the scanned address; the sticker may not even exist. */
  publicTagId: string;
  category: string;
  body: string;
  /** Gemini's short reason, for the admin. */
  reason: string;
  locale: string;
  ipHash: string;
  /** Kept so a message delivered after review is complete. */
  scannerContact: string | null;
  scannerSessionId: string | null;
  /** TTL index removes it after the same retention as ordinary messages. */
  expiresAt: Date;
  createdAt: Date;
}

const blockedMessageSchema = new Schema<BlockedMessage>(
  {
    publicId: { type: String, maxlength: 20 },
    publicTagId: { type: String, required: true, maxlength: 20 },
    category: { type: String, required: true, maxlength: 40 },
    body: { type: String, required: true, maxlength: 2000 },
    reason: { type: String, default: '', maxlength: 300 },
    locale: { type: String, required: true, maxlength: 5 },
    ipHash: { type: String, required: true, maxlength: 128 },
    scannerContact: { type: String, default: null, maxlength: 200 },
    scannerSessionId: { type: String, default: null, maxlength: 128 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'blockedMessages' },
);

blockedMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
blockedMessageSchema.index({ createdAt: -1 });
// Sparse: the first entries, made before public ids existed, have none.
blockedMessageSchema.index({ publicId: 1 }, { unique: true, sparse: true });

export const BlockedMessageModel: Model<BlockedMessage> =
  (models.BlockedMessage as Model<BlockedMessage> | undefined) ??
  model<BlockedMessage>('BlockedMessage', blockedMessageSchema);
