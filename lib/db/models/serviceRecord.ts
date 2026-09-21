import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { CARE_FIELD_LIMITS as L, SERVICE_RECORD_KINDS, type ServiceRecordKind } from '@/lib/domain/constants';

/**
 * One entry in a car book's log: an oil change or other work on the car.
 * OWNER ONLY. `publicId` is the owner's handle for deleting it (rule 4).
 */
export interface ServiceRecord {
  publicId: string;
  vehicleId: Types.ObjectId;
  /** Denormalized for owner-scoped queries. */
  ownerId: Types.ObjectId;
  kind: ServiceRecordKind;
  date: Date;
  km: number | null;
  /** Repairs: what was done. */
  work: string | null;
  /** Oil changes: the oil used. */
  oilType: string | null;
  garage: string | null;
  costDzd: number | null;
  /** Oil changes: the next one, typed by hand by the owner. */
  nextDueDate: Date | null;
  nextDueKm: number | null;
  note: string | null;
  /** The due date a reminder was sent for (see VehicleCare.remindedFor). */
  remindedFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const serviceRecordSchema = new Schema<ServiceRecord>(
  {
    publicId: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: SERVICE_RECORD_KINDS, required: true },
    date: { type: Date, required: true },
    km: { type: Number, min: 0, max: L.km, default: null },
    work: { type: String, maxlength: L.work.max, default: null },
    oilType: { type: String, maxlength: L.oilType, default: null },
    garage: { type: String, maxlength: L.garage, default: null },
    costDzd: { type: Number, min: 0, max: L.costDzd, default: null },
    nextDueDate: { type: Date, default: null },
    nextDueKm: { type: Number, min: 0, max: L.km, default: null },
    note: { type: String, maxlength: L.note, default: null },
    remindedFor: { type: Date, default: null },
  },
  { timestamps: true, collection: 'serviceRecords' },
);

// A car's log, newest first; also finds the latest oil change per car.
serviceRecordSchema.index({ vehicleId: 1, kind: 1, date: -1, createdAt: -1 });

export const ServiceRecordModel: Model<ServiceRecord> =
  (models.ServiceRecord as Model<ServiceRecord> | undefined) ??
  model<ServiceRecord>('ServiceRecord', serviceRecordSchema);
