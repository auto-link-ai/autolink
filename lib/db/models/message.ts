import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  MESSAGE_CATEGORIES,
  MESSAGE_STATUSES,
  STORAGE_LIMITS,
  type MessageCategory,
  type MessageStatus,
} from '@/lib/domain/constants';
import { locales, type Locale } from '@/i18n/locales';

export interface Message {
  /**
   * Opaque public identifier used by the owner dashboard (mark read, archive).
   * Exists because rule 4 forbids exposing `_id` to the client.
   */
  publicId: string;
  vehicleId: Types.ObjectId;
  tagId: Types.ObjectId;
  /** Denormalized for the dashboard query. */
  ownerId: Types.ObjectId;
  category: MessageCategory;
  body: string;
  scannerContact: string | null;
  /** Opaque random value from a cookie. Not identifying. */
  scannerSessionId: string;
  /** HMAC(ip, IP_HASH_SALT). The raw IP is never stored. */
  ipHash: string;
  locale: Locale;
  status: MessageStatus;
  readAt: Date | null;
  /** Retention: the TTL index deletes the document at this time. */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<Message>(
  {
    publicId: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: MESSAGE_CATEGORIES, required: true },
    // Effective limit comes from settings.maxMessageLength; this is the storage ceiling.
    body: { type: String, default: '', maxlength: STORAGE_LIMITS.messageBody },
    scannerContact: { type: String, default: null, maxlength: STORAGE_LIMITS.scannerContact },
    scannerSessionId: { type: String, required: true },
    ipHash: { type: String, required: true },
    locale: { type: String, enum: locales, required: true },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'UNREAD' },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'messages' },
);

// These compound indexes also serve single-field lookups on ownerId and vehicleId.
messageSchema.index({ ownerId: 1, createdAt: -1 });
messageSchema.index({ vehicleId: 1, status: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MessageModel: Model<Message> =
  (models.Message as Model<Message> | undefined) ?? model<Message>('Message', messageSchema);
