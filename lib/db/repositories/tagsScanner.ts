/**
 * Repository: tags — scanner side (/t/[tagId])
 *
 * SECURITY BOUNDARY — only repositories import models. This is the most exposed
 * query in the product: anyone who scans a sticker runs it.
 * - It returns the car's make, model and colour ONLY when the owner asked for
 *   them to be shown, and never the owner's name, phone, email, address or
 *   plate (rule 1).
 * - An ACTIVE sticker is `linked`; one nobody owns yet is `waiting`, so whoever
 *   scans it first can link it (rule 9: the packaging hides the QR until
 *   delivery). It returns null for everything else — unknown, deactivated,
 *   suspended, lost — so the page cannot tell those apart.
 * - No `_id` leaves this module (rule 4).
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { TagModel } from '@/lib/db/models/tag';
import { VehicleModel } from '@/lib/db/models/vehicle';
import { carName } from '@/lib/vehicles/carName';
import { isValidTagIdShape } from '@/lib/validation/tagId';

/** Everything the scan page may show. */
export type ScannerTagView =
  | {
      state: 'linked';
      publicTagId: string;
      /** Null when the owner keeps the car's details private, or has not given them yet. */
      vehicle: { brand: string; model: string; color: string } | null;
    }
  | { state: 'waiting'; publicTagId: string };

export const scannerTagsRepository = {
  async findForScanner(publicTagId: string): Promise<ScannerTagView | null> {
    // Shape first: a malformed id never reaches the database.
    if (!isValidTagIdShape(publicTagId)) return null;
    await connectToDatabase();

    const tag = await TagModel.findOne(
      {
        publicTagId,
        $or: [{ status: 'ACTIVE' }, { status: 'UNASSIGNED', ownerId: null }],
      },
      { _id: 0, publicTagId: 1, status: 1, vehicleId: 1 },
    ).lean();
    if (!tag) return null;
    if (tag.status === 'UNASSIGNED') return { state: 'waiting', publicTagId: tag.publicTagId };

    const vehicle = tag.vehicleId
      ? await VehicleModel.findById(tag.vehicleId, {
          _id: 0,
          brand: 1,
          model: 1,
          color: 1,
          showDetailsPublicly: 1,
        }).lean()
      : null;

    return {
      state: 'linked',
      publicTagId: tag.publicTagId,
      vehicle:
        vehicle && vehicle.showDetailsPublicly && carName(vehicle)
          ? { brand: vehicle.brand, model: vehicle.model, color: vehicle.color }
          : null,
    };
  },
};
