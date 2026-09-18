/**
 * Repository: settings (singleton, key 'global')
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; the repository layer is
 * the only code allowed to import models. Settings are global, not owner-scoped:
 * any server code may read them (via lib/config/settings.ts, which caches), but
 * writes are admin-only and must be called with an AdminActor (Phase 7).
 * Returned objects never include `_id`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { SettingModel, type DeliveryFee, type Setting } from '@/lib/db/models/setting';

export type AppSettings = Omit<Setting, 'key' | 'createdAt' | 'updatedAt'>;
export type { DeliveryFee };

function toAppSettings(doc: Setting): AppSettings {
  return {
    unitPriceDzd: doc.unitPriceDzd,
    currencyLabel: doc.currencyLabel,
    messageRetentionDays: doc.messageRetentionDays,
    maxMessageLength: doc.maxMessageLength,
    rateLimitPerTagPerHour: doc.rateLimitPerTagPerHour,
    rateLimitPerIpPerHour: doc.rateLimitPerIpPerHour,
    captchaThreshold: doc.captchaThreshold,
    deliveryFees: doc.deliveryFees.map(({ wilayaCode, home, stopdesk }) => ({
      wilayaCode,
      home,
      stopdesk,
    })),
    maxOrderQuantity: doc.maxOrderQuantity,
  };
}

export const settingsRepository = {
  /** Reads the singleton, creating it with schema defaults on first read. */
  async getOrCreateGlobal(): Promise<AppSettings> {
    await connectToDatabase();
    const doc = await SettingModel.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, lean: true },
    );
    if (!doc) throw new Error('Settings document could not be created.');
    return toAppSettings(doc);
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
