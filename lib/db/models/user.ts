import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { USER_STATUSES, type UserStatus } from '@/lib/domain/constants';
import { PUBLIC_USER_ID_PATTERN } from '@/lib/validation/publicUserId';
import { locales, type Locale } from '@/i18n/locales';

export interface User {
  /** 'USR-' + 8 Crockford characters. What the admin addresses the account by. */
  publicUserId: string;
  email: string;
  passwordHash: string;
  name?: string | null;
  phone?: string | null;
  locale: Locale;
  emailNotifications: boolean;
  emailVerifiedAt: Date | null;
  firstName?: string | null;
  lastName?: string | null;
  /** argon2id over HMAC(PIN_SECRET, pin) — see lib/security/pin.ts. */
  pinHash?: string | null;
  /** Copied into the session; bumping it signs every other device out. */
  sessionVersion: number;
  /** Car book reminders on WhatsApp too. Off until the owner switches them on. */
  whatsappReminders: boolean;
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
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false — the hash is only loaded when a repository explicitly asks for it.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: null },
    phone: { type: String, default: null }, // normalized 0XXXXXXXXX
    locale: { type: String, enum: locales, default: 'fr' },
    emailNotifications: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date, default: null },
    firstName: { type: String, trim: true, default: null },
    lastName: { type: String, trim: true, default: null },
    pinHash: { type: String, select: false },
    sessionVersion: { type: Number, default: 0, min: 0 },
    whatsappReminders: { type: Boolean, default: false },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

export const UserModel: Model<User> =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
