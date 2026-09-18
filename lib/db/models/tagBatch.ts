import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface TagBatch {
  label: string;
  quantity: number;
  createdByAdminId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tagBatchSchema = new Schema<TagBatch>(
  {
    label: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: true, collection: 'tagBatches' },
);

export const TagBatchModel: Model<TagBatch> =
  (models.TagBatch as Model<TagBatch> | undefined) ?? model<TagBatch>('TagBatch', tagBatchSchema);
