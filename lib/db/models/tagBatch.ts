import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface TagBatch {
  /** Opaque public handle ('B-' + 8 chars) used by the admin UI (rule 4: no `_id` on the client). */
  publicId: string;
  label: string;
  quantity: number;
  createdByAdminId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tagBatchSchema = new Schema<TagBatch>(
  {
    publicId: { type: String, required: true, unique: true },
    label: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: true, collection: 'tagBatches' },
);

tagBatchSchema.index({ createdAt: -1 });

export const TagBatchModel: Model<TagBatch> =
  (models.TagBatch as Model<TagBatch> | undefined) ?? model<TagBatch>('TagBatch', tagBatchSchema);
