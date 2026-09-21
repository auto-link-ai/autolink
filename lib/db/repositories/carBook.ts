/**
 * Repository: the owner's private car book (details and due dates)
 *
 * SECURITY BOUNDARY — only repositories import models. Every function takes an
 * `OwnerActor` and goes through `findOwnedVehicle`, so another account's
 * sticker reads as "no such car book". Nothing here is ever reachable from the
 * scanner repository; the scan page asks `summaryForOwner` only after the
 * signed-in owner has been verified, and gets null for anyone else.
 * Returned objects never include `_id` (rule 4).
 */
import 'server-only';
import type { Types } from 'mongoose';
import type { DueInputs } from '@/lib/care/due';
import { connectToDatabase } from '@/lib/db/connect';
import { ServiceRecordModel, type ServiceRecord } from '@/lib/db/models/serviceRecord';
import { TagModel } from '@/lib/db/models/tag';
import { VehicleModel, type Vehicle, type VehicleCare } from '@/lib/db/models/vehicle';
import type { ServiceRecordKind } from '@/lib/domain/constants';
import type {
  InspectionInput,
  InsuranceInput,
  NotesInput,
  ProfileInput,
  VignetteInput,
} from '@/lib/validation/carCare';
import type { OwnerActor } from './actor';
import { toObjectId } from './objectId';
import { findOwnedVehicle } from './ownedVehicle';

export interface ServiceRecordDTO {
  publicId: string;
  kind: ServiceRecordKind;
  date: Date;
  km: number | null;
  work: string | null;
  oilType: string | null;
  garage: string | null;
  costDzd: number | null;
  nextDueDate: Date | null;
  nextDueKm: number | null;
  note: string | null;
}

export interface CarBookDTO {
  publicTagId: string;
  car: { brand: string; model: string; color: string; plateNumber: string | null };
  profile: ProfileInput;
  insurance: InsuranceInput;
  inspection: InspectionInput;
  vignette: VignetteInput;
  notes: string | null;
  oilChanges: ServiceRecordDTO[];
  repairs: ServiceRecordDTO[];
  due: DueInputs;
}

/** What the scan page shows its owner: the car and what is coming up. */
export interface CarSummaryDTO {
  publicTagId: string;
  car: { brand: string; model: string; color: string };
  due: DueInputs;
}

export type CareDetailsPatch =
  | { section: 'profile'; input: ProfileInput }
  | { section: 'insurance'; input: InsuranceInput }
  | { section: 'inspection'; input: InspectionInput }
  | { section: 'vignette'; input: VignetteInput }
  | { section: 'notes'; input: NotesInput };

/** The newest entries of each kind; older ones stay stored. */
const LOG_LIMIT = 50;

/** A car whose book was never opened has no `care` at all: read it as empty. */
function careOf(vehicle: Pick<Vehicle, 'care'>) {
  const care: Partial<VehicleCare> = vehicle.care ?? {};
  return {
    profile: {
      year: care.year ?? null,
      fuel: care.fuel ?? null,
      engine: care.engine ?? null,
      vin: care.vin ?? null,
      registrationNumber: care.registrationNumber ?? null,
    },
    insurance: {
      company: care.insurance?.company ?? null,
      policyNumber: care.insurance?.policyNumber ?? null,
      startDate: care.insurance?.startDate ?? null,
      expiryDate: care.insurance?.expiryDate ?? null,
    },
    inspection: {
      lastDate: care.inspection?.lastDate ?? null,
      nextDueDate: care.inspection?.nextDueDate ?? null,
      centre: care.inspection?.centre ?? null,
    },
    vignette: { paidDate: care.vignette?.paidDate ?? null, nextDueDate: care.vignette?.nextDueDate ?? null },
    notes: care.notes ?? null,
  };
}

function toRecord(doc: ServiceRecord): ServiceRecordDTO {
  return {
    publicId: doc.publicId,
    kind: doc.kind,
    date: doc.date,
    km: doc.km ?? null,
    work: doc.work ?? null,
    oilType: doc.oilType ?? null,
    garage: doc.garage ?? null,
    costDzd: doc.costDzd ?? null,
    nextDueDate: doc.nextDueDate ?? null,
    nextDueKm: doc.nextDueKm ?? null,
    note: doc.note ?? null,
  };
}

function dueFrom(
  care: ReturnType<typeof careOf>,
  latestOil: Pick<ServiceRecord, 'nextDueDate' | 'nextDueKm'> | null | undefined,
): DueInputs {
  return {
    oilChange: latestOil ? { date: latestOil.nextDueDate ?? null, km: latestOil.nextDueKm ?? null } : null,
    insuranceExpiry: care.insurance.expiryDate,
    inspectionDue: care.inspection.nextDueDate,
    vignetteDue: care.vignette.nextDueDate,
  };
}

function logOf(vehicleId: Types.ObjectId, ownerId: Types.ObjectId, kind: ServiceRecordKind) {
  return ServiceRecordModel.find({ vehicleId, ownerId, kind }).sort({ date: -1, createdAt: -1 }).limit(LOG_LIMIT).lean();
}

function patchOf(change: CareDetailsPatch): Record<string, unknown> {
  const prefix = change.section === 'profile' || change.section === 'notes' ? 'care' : `care.${change.section}`;
  return Object.fromEntries(Object.entries(change.input).map(([field, value]) => [`${prefix}.${field}`, value]));
}

export const carBookRepository = {
  async getBook(owner: OwnerActor, publicTagId: string): Promise<CarBookDTO | null> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned) return null;
    const { vehicleId, ownerId } = owned;

    const [vehicle, oilChanges, repairs] = await Promise.all([
      VehicleModel.findOne({ _id: vehicleId, ownerId }, { brand: 1, model: 1, color: 1, plateNumber: 1, care: 1 }).lean(),
      logOf(vehicleId, ownerId, 'OIL_CHANGE'),
      logOf(vehicleId, ownerId, 'REPAIR'),
    ]);
    if (!vehicle) return null;

    const care = careOf(vehicle);
    return {
      publicTagId,
      car: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color, plateNumber: vehicle.plateNumber ?? null },
      ...care,
      oilChanges: oilChanges.map(toRecord),
      repairs: repairs.map(toRecord),
      due: dueFrom(care, oilChanges[0]),
    };
  },

  async summaryForOwner(owner: OwnerActor, publicTagId: string): Promise<CarSummaryDTO | null> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned) return null;
    const { vehicleId, ownerId } = owned;

    const [vehicle, latestOil] = await Promise.all([
      VehicleModel.findOne({ _id: vehicleId, ownerId }, { brand: 1, model: 1, color: 1, care: 1 }).lean(),
      ServiceRecordModel.findOne({ vehicleId, ownerId, kind: 'OIL_CHANGE' }, { nextDueDate: 1, nextDueKm: 1 })
        .sort({ date: -1, createdAt: -1 })
        .lean(),
    ]);
    if (!vehicle) return null;
    return {
      publicTagId,
      car: { brand: vehicle.brand, model: vehicle.model, color: vehicle.color },
      due: dueFrom(careOf(vehicle), latestOil),
    };
  },

  /** Due dates for every sticker the owner has, keyed by sticker id (dashboard hints). */
  async dueForOwner(owner: OwnerActor): Promise<Map<string, DueInputs>> {
    const ownerId = toObjectId(owner.userId);
    if (!ownerId) return new Map();
    await connectToDatabase();

    const tags = await TagModel.find({ ownerId, vehicleId: { $ne: null } }, { publicTagId: 1, vehicleId: 1 }).lean();
    const vehicleIds = tags.map((tag) => tag.vehicleId!);
    const [vehicles, latestOils] = await Promise.all([
      VehicleModel.find({ _id: { $in: vehicleIds }, ownerId }, { care: 1 }).lean(),
      ServiceRecordModel.aggregate<{ _id: Types.ObjectId; nextDueDate: Date | null; nextDueKm: number | null }>([
        { $match: { ownerId, kind: 'OIL_CHANGE', vehicleId: { $in: vehicleIds } } },
        { $sort: { vehicleId: 1, date: -1, createdAt: -1 } },
        { $group: { _id: '$vehicleId', nextDueDate: { $first: '$nextDueDate' }, nextDueKm: { $first: '$nextDueKm' } } },
      ]),
    ]);

    const byVehicle = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));
    const oilByVehicle = new Map(latestOils.map((oil) => [oil._id.toString(), oil]));
    const out = new Map<string, DueInputs>();
    for (const tag of tags) {
      const key = tag.vehicleId!.toString();
      const vehicle = byVehicle.get(key);
      if (vehicle) out.set(tag.publicTagId, dueFrom(careOf(vehicle), oilByVehicle.get(key)));
    }
    return out;
  },

  /** Saves one section of details. Unknown or someone else's sticker: nothing changes. */
  async saveDetails(owner: OwnerActor, publicTagId: string, change: CareDetailsPatch): Promise<{ ok: boolean }> {
    const owned = await findOwnedVehicle(owner, publicTagId);
    if (!owned) return { ok: false };
    const result = await VehicleModel.updateOne(
      { _id: owned.vehicleId, ownerId: owned.ownerId },
      { $set: patchOf(change) },
      { runValidators: true },
    );
    return { ok: result.matchedCount === 1 };
  },
};
