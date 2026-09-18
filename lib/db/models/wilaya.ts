import 'server-only';
import { Schema, model, models, type Model } from 'mongoose';
import { WILAYA_CODE_MAX, WILAYA_CODE_MIN } from '@/lib/domain/constants';

/** Seeded reference data (58 entries). */
export interface Wilaya {
  code: number;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  createdAt: Date;
  updatedAt: Date;
}

const wilayaSchema = new Schema<Wilaya>(
  {
    code: { type: Number, required: true, unique: true, min: WILAYA_CODE_MIN, max: WILAYA_CODE_MAX },
    nameFr: { type: String, required: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
  },
  { timestamps: true, collection: 'wilayas' },
);

export const WilayaModel: Model<Wilaya> =
  (models.Wilaya as Model<Wilaya> | undefined) ?? model<Wilaya>('Wilaya', wilayaSchema);
