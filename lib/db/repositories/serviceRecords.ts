/**
 * Repository: car book log entries (oil changes, repairs)
 *
 * SECURITY BOUNDARY — only repositories import models. Writes go through
 * `findOwnedVehicle`, and a delete matches the entry's public id AND the car AND
 * the owner, so an id copied from another account deletes nothing.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
import { CARE_FIELD_LIMITS } from '@/lib/domain/constants';
import { encodeCrockford } from '@/lib/tags/generate';
import type { OilChangeInput, RepairInput } from '@/lib/validation/carCare';
import type { OwnerActor } from './actor';
import { findOwnedVehicle } from './ownedVehicle';

export type NewServiceRecord = { kind: 'OIL_CHANGE'; input: OilChangeInput } | { kind: 'REPAIR'; input: RepairInput };

/** 'REC-' + 10 Crockford characters: the owner's handle for one entry. */
function generateRecordPublicId(): string {
  return 'REC-' + encodeCrockford(randomBytes(7), 10);
}

export const serviceRecordsRepository = {
  async add(owner: OwnerActor, publicTagId: string, entry: NewServiceRecord): Promise<{ ok: boolean }> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned) return { ok: false };
    const stored = await ServiceRecordModel.countDocuments({ vehicleId: owned.vehicleId, ownerId: owned.ownerId });
    if (stored >= CARE_FIELD_LIMITS.recordsPerCar) return { ok: false };

    const fields =
      entry.kind === 'OIL_CHANGE'
        ? { ...entry.input, work: null }
        : { ...entry.input, oilType: null, nextDueDate: null, nextDueKm: null };
    await ServiceRecordModel.create({
      ...fields,
      publicId: generateRecordPublicId(),
      vehicleId: owned.vehicleId,
      ownerId: owned.ownerId,
      kind: entry.kind,
    });
    return { ok: true };
  },

  async remove(owner: OwnerActor, publicTagId: string, recordPublicId: string): Promise<{ ok: boolean }> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned || !/^REC-[0-9A-HJKMNP-TV-Z]{10}$/.test(recordPublicId)) return { ok: false };
    const result = await ServiceRecordModel.deleteOne({
      publicId: recordPublicId,
      vehicleId: owned.vehicleId,
      ownerId: owned.ownerId,
    });
    return { ok: result.deletedCount === 1 };
  },
};
