import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { TAG_STATUSES, type TagStatus } from '@/lib/domain/constants';

export interface Tag {
  /** 'AUT-' + 8 Crockford base32 chars. The only identifier that ever leaves the server. */
  publicTagId: string;
  status: TagStatus;
  vehicleId: Types.ObjectId | null;
  /** Denormalized from the vehicle for fast ownership checks. */
  ownerId: Types.ObjectId | null;
  batchId: Types.ObjectId | null;
  orderId: Types.ObjectId | null;
  activatedAt: Date | null;
  /** Transfer-ready; no MVP UI. */
  transferredFrom: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const tagSchema = new Schema<Tag>(
  {
    publicTagId: { type: String, required: true, unique: true },
    status: { type: String, enum: TAG_STATUSES, default: 'UNASSIGNED' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'TagBatch', default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    activatedAt: { type: Date, default: null },
    transferredFrom: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'tags' },
);

// Batch status counts.
tagSchema.index({ batchId: 1, status: 1 });
// Admin list: newest first, optionally filtered by status.
tagSchema.index({ status: 1, createdAt: -1 });
tagSchema.index({ createdAt: -1 });
// Tags linked to an order (release on cancel / reassignment).
tagSchema.index({ orderId: 1 }, { partialFilterExpression: { orderId: { $type: 'objectId' } } });

export const TagModel: Model<Tag> =
  (models.Tag as Model<Tag> | undefined) ?? model<Tag>('Tag', tagSchema);
