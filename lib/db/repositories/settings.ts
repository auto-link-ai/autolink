/**
 * Repository: settings (singleton, key 'global')
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; the repository layer is
 * the only code allowed to import models. Settings are global, not owner-scoped:
 * any server code may read them (via lib/config/settings.ts, which caches), but
 * writes are admin-only, take an AdminActor, and write an audit entry in the
 * same transaction. Returned objects never include `_id`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { SettingModel, type DeliveryFee, type Setting } from '@/lib/db/models/setting';
import type { AdminActor } from './actor';
import { auditLogsRepository } from './auditLogs';

export type AppSettings = Omit<Setting, 'key' | 'createdAt' | 'updatedAt'>;
export type { DeliveryFee };

/** The settings an admin edits on /admin/settings (price, quantity, order limit, fees). */
export interface CommerceSettingsInput {
  unitPriceDzd: number;
  currencyLabel: string;
  maxOrderQuantity: number;
  rateLimitOrdersPerHour: number;
  deliveryFees: DeliveryFee[];
}

function toAppSettings(doc: Setting): AppSettings {
  return {
    unitPriceDzd: doc.unitPriceDzd,
    currencyLabel: doc.currencyLabel,
    messageRetentionDays: doc.messageRetentionDays,
    maxMessageLength: doc.maxMessageLength,
    rateLimitPerTagPerHour: doc.rateLimitPerTagPerHour,
    rateLimitPerIpPerHour: doc.rateLimitPerIpPerHour,
    captchaThreshold: doc.captchaThreshold,
    rateLimitAdminLoginPerHour: doc.rateLimitAdminLoginPerHour,
    rateLimitOrdersPerHour: doc.rateLimitOrdersPerHour,
    deliveryFees: doc.deliveryFees.map(({ wilayaCode, home, stopdesk }) => ({
      wilayaCode,
      home,
      stopdesk,
    })),
    maxOrderQuantity: doc.maxOrderQuantity,
  };
}

export const settingsRepository = {
  /**
   * Reads the singleton, creating it with schema defaults on first read.
   * Not `lean`: hydrating applies schema defaults to fields added after the
   * document was created, so a new setting works without a migration.
   */
  async getOrCreateGlobal(): Promise<AppSettings> {
    await connectToDatabase();
    const doc = await SettingModel.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
    if (!doc) throw new Error('Settings document could not be created.');
    return toAppSettings(doc.toObject());
  },

  /** Admin: price, quantity limit, order rate limit and per-wilaya delivery fees. */
  async updateCommerce(admin: AdminActor, input: CommerceSettingsInput): Promise<void> {
    const mongoose = await connectToDatabase();
    await mongoose.connection.transaction(async (session) => {
      const before = await SettingModel.findOne(
        { key: 'global' },
        { _id: 0, unitPriceDzd: 1, maxOrderQuantity: 1, rateLimitOrdersPerHour: 1 },
        { session },
      ).lean();
      await SettingModel.updateOne(
        { key: 'global' },
        {
          $set: {
            unitPriceDzd: input.unitPriceDzd,
            currencyLabel: input.currencyLabel,
            maxOrderQuantity: input.maxOrderQuantity,
            rateLimitOrdersPerHour: input.rateLimitOrdersPerHour,
            deliveryFees: input.deliveryFees,
          },
        },
        { session, upsert: true, runValidators: true },
      );
      await auditLogsRepository.append(
        admin,
        {
          action: 'SETTINGS_UPDATE',
          targetType: 'settings',
          targetId: 'global',
          metadata: {
            before: before ?? null,
            after: {
              unitPriceDzd: input.unitPriceDzd,
              maxOrderQuantity: input.maxOrderQuantity,
              rateLimitOrdersPerHour: input.rateLimitOrdersPerHour,
            },
            deliveryFeesUpdated: input.deliveryFees.length,
          },
        },
        session,
      );
    });
  },

  /** Seed helper: writes delivery fees only if none are configured yet. */
  async setDeliveryFeesIfEmpty(fees: DeliveryFee[]): Promise<boolean> {
    await connectToDatabase();
    const result = await SettingModel.updateOne(
      { key: 'global', deliveryFees: { $size: 0 } },
      { $set: { deliveryFees: fees } },
    );
    return result.modifiedCount > 0;
  },
};
