/**
 * Repository: wilayas (seeded reference data)
 *
 * SECURITY BOUNDARY — only repositories import models. Wilayas are public
 * reference data (not owner-scoped); writes happen only from the seed script.
 * Returned objects never include `_id`.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { WilayaModel } from '@/lib/db/models/wilaya';

export interface WilayaDTO {
  code: number;
  nameFr: string;
  nameAr: string;
  nameEn: string;
}

export const wilayasRepository = {
  async list(): Promise<WilayaDTO[]> {
    await connectToDatabase();
    const docs = await WilayaModel.find({}, { _id: 0, code: 1, nameFr: 1, nameAr: 1, nameEn: 1 })
      .sort({ code: 1 })
      .lean();
    return docs.map(({ code, nameFr, nameAr, nameEn }) => ({ code, nameFr, nameAr, nameEn }));
  },

  /** Idempotent upsert keyed by code. Returns the number of documents inserted or changed. */
  async upsertAll(wilayas: readonly WilayaDTO[]): Promise<number> {
    await connectToDatabase();
    const result = await WilayaModel.bulkWrite(
      wilayas.map((w) => ({
        updateOne: {
          filter: { code: w.code },
          update: { $set: { nameFr: w.nameFr, nameAr: w.nameAr, nameEn: w.nameEn } },
          upsert: true,
        },
      })),
    );
    return result.upsertedCount + result.modifiedCount;
  },
};
