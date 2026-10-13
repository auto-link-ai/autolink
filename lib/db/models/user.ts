import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { USER_STATUSES, type UserStatus } from '@/lib/domain/constants';
import { PUBLIC_USER_ID_PATTERN } from '@/lib/validation/publicUserId';
import { locales, type Locale } from '@/i18n/locales';

/**
 * A car owner. They sign in with their WhatsApp number and a 4-digit PIN; the
 * number is proven by a WhatsApp code when the account is made, so it is
 * unique, and it is also where their alerts go.
 */
export interface User {
  /** 'USR-' + 8 Crockford characters. What the admin addresses the account by. */
  publicUserId: string;
  firstName: string;
  lastName: string;
  /** Normalized 0XXXXXXXXX. */
  phone: string;
  /** argon2id over HMAC(PIN_SECRET, pin) — see lib/security/pin.ts. */
  pinHash: string;
  /** Copied into the session; bumping it signs every other device out. */
  sessionVersion: number;
  /** Car book reminders on WhatsApp too. Off until the owner switches them on. */
  whatsappReminders: boolean;
  locale: Locale;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    // sparse: accounts created before this field existed have none until
    // `pnpm backfill:user-ids` runs, and a unique index would otherwise reject
    // the second such document.
    publicUserId: { type: String, required: true, unique: true, sparse: true, match: PUBLIC_USER_ID_PATTERN },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    // select: false — the hash is only loaded when a repository explicitly asks for it.
    pinHash: { type: String, required: true, select: false },
    sessionVersion: { type: Number, default: 0, min: 0 },
    whatsappReminders: { type: Boolean, default: false },
    locale: { type: String, enum: locales, default: 'ar' },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

export const UserModel: Model<User> =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
