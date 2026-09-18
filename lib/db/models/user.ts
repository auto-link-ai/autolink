import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { USER_STATUSES, type UserStatus } from '@/lib/domain/constants';
import { locales, type Locale } from '@/i18n/locales';

export interface User {
  email: string;
  passwordHash: string;
  name?: string | null;
  phone?: string | null;
  locale: Locale;
  emailNotifications: boolean;
  emailVerifiedAt: Date | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false — the hash is only loaded when a repository explicitly asks for it.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: null },
    phone: { type: String, default: null }, // normalized 0XXXXXXXXX
    locale: { type: String, enum: locales, default: 'fr' },
    emailNotifications: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: USER_STATUSES, default: 'ACTIVE' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'users' },
);

export const UserModel: Model<User> =
  (models.User as Model<User> | undefined) ?? model<User>('User', userSchema);
