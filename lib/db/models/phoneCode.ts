import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { PHONE_CODE_PURPOSES, type PhoneCodePurpose } from '@/lib/domain/constants';
import { locales, type Locale } from '@/i18n/locales';

/** What the owner typed on the activation screen, kept until the code proves the phone. */
export interface ActivationDetails {
  firstName: string;
  lastName: string;
  brand: string;
  model: string;
  locale: Locale;
}

/**
 * One WhatsApp verification challenge. The browser only ever holds `publicId`;
 * the phone, the sticker and the details come back from here, never from the
 * form, so a later step cannot swap any of them.
 */
export interface PhoneCode {
  /** 'CHL-' + 16 Crockford characters. */
  publicId: string;
  /** Normalized 0XXXXXXXXX. */
  phone: string;
  purpose: PhoneCodePurpose;
  /** The sticker being activated (ACTIVATE only). */
  tagId: string | null;
  details: ActivationDetails | null;
  /** HMAC of the code under PIN_SECRET — never the code itself. */
  codeHash: string;
  /** A "forgot PIN" for a number with no account: looks the same, never verifies. */
  decoy: boolean;
  attempts: number;
  consumedAt: Date | null;
  /** TTL index removes the row once the code has expired. */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const detailsSchema = new Schema<ActivationDetails>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    locale: { type: String, enum: locales, required: true },
  },
  { _id: false },
);

const phoneCodeSchema = new Schema<PhoneCode>(
  {
    publicId: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    purpose: { type: String, enum: PHONE_CODE_PURPOSES, required: true },
    tagId: { type: String, default: null },
    details: { type: detailsSchema, default: null },
    codeHash: { type: String, required: true, select: false },
    decoy: { type: Boolean, default: false },
    attempts: { type: Number, default: 0, min: 0 },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'phoneCodes' },
);

phoneCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PhoneCodeModel: Model<PhoneCode> =
  (models.PhoneCode as Model<PhoneCode> | undefined) ?? model<PhoneCode>('PhoneCode', phoneCodeSchema);
