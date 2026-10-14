import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { RENEWAL_STATUSES, type RenewalStatus } from '@/lib/domain/constants';

/**
 * An owner asking to extend one sticker's service. Nothing is charged online:
 * an admin collects the payment and confirms, which moves the tag's
 * `serviceUntil` forward by `months`. Price and months are snapshots taken
 * from settings when the owner asked, as an order's prices are.
 */
export interface Renewal {
  /** 'RN-' + 6 chars, shown to the owner. */
  ref: string;
  tagId: Types.ObjectId;
  /** Denormalized for the admin list; never used to find the tag. */
  publicTagId: string;
  ownerId: Types.ObjectId;
  price: number;
  months: number;
  status: RenewalStatus;
  /** When an admin confirmed or cancelled it. */
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const renewalSchema = new Schema<Renewal>(
  {
    ref: { type: String, required: true, unique: true },
    tagId: { type: Schema.Types.ObjectId, ref: 'Tag', required: true },
    publicTagId: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    months: { type: Number, required: true, min: 1 },
    status: { type: String, enum: RENEWAL_STATUSES, default: 'PENDING' },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'renewals' },
);

// One open request per sticker: asking twice finds the first.
renewalSchema.index({ tagId: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });
// Admin list: pending first, newest first.
renewalSchema.index({ status: 1, createdAt: -1 });

export const RenewalModel: Model<Renewal> =
  (models.Renewal as Model<Renewal> | undefined) ?? model<Renewal>('Renewal', renewalSchema);
