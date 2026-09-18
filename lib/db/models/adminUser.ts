import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { ADMIN_ROLES, type AdminRole } from '@/lib/domain/constants';

export interface AdminUser {
  email: string;
  passwordHash: string;
  role: AdminRole;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<AdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'ADMIN' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'adminUsers' },
);

export const AdminUserModel: Model<AdminUser> =
  (models.AdminUser as Model<AdminUser> | undefined) ??
  model<AdminUser>('AdminUser', adminUserSchema);
