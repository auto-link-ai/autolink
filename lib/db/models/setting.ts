import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { WILAYA_CODE_MAX, WILAYA_CODE_MIN } from '@/lib/domain/constants';

export interface DeliveryFee {
  wilayaCode: number;
  home: number;
  stopdesk: number;
}

/**
 * Singleton document (key 'global'). The schema defaults below ARE the product
 * defaults — they are applied when the document is first created, and admins
 * change them from /admin/settings. Application code reads them only through
 * lib/config/settings.ts.
 */
export interface Setting {
  key: 'global';
  unitPriceDzd: number;
  currencyLabel: string;
  messageRetentionDays: number;
  maxMessageLength: number;
  rateLimitPerTagPerHour: number;
  rateLimitPerIpPerHour: number;
  /** Messages from one session/IP before Turnstile is required. */
  captchaThreshold: number;
  deliveryFees: DeliveryFee[];
  maxOrderQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryFeeSchema = new Schema<DeliveryFee>(
  {
    wilayaCode: { type: Number, required: true, min: WILAYA_CODE_MIN, max: WILAYA_CODE_MAX },
    home: { type: Number, required: true, min: 0 },
    stopdesk: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const settingSchema = new Schema<Setting>(
  {
    key: { type: String, enum: ['global'], required: true, unique: true },
    unitPriceDzd: { type: Number, default: 1500, min: 0 },
    currencyLabel: { type: String, default: 'DA' },
    messageRetentionDays: { type: Number, default: 90, min: 1 },
    maxMessageLength: { type: Number, default: 400, min: 1 },
    rateLimitPerTagPerHour: { type: Number, default: 5, min: 1 },
    rateLimitPerIpPerHour: { type: Number, default: 10, min: 1 },
    captchaThreshold: { type: Number, default: 3, min: 0 },
    deliveryFees: { type: [deliveryFeeSchema], default: [] },
    maxOrderQuantity: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true, collection: 'settings' },
);

export const SettingModel: Model<Setting> =
  (models.Setting as Model<Setting> | undefined) ?? model<Setting>('Setting', settingSchema);
