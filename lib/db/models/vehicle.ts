import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { CAR_FUELS, type CarFuel } from '@/lib/domain/constants';

/**
 * The owner's private car book, minus its log entries (see serviceRecord.ts).
 * OWNER ONLY: never read by the scanner repository, never on a public route.
 * `remindedFor` holds the due date a reminder was last sent for, so a changed
 * date re-arms the reminder and an unchanged one is never sent twice.
 */
export interface VehicleCare {
  year: number | null;
  fuel: CarFuel | null;
  engine: string | null;
  vin: string | null;
  registrationNumber: string | null;
  insurance: {
    company: string | null;
    policyNumber: string | null;
    startDate: Date | null;
    expiryDate: Date | null;
    remindedFor: Date | null;
  };
  inspection: { lastDate: Date | null; nextDueDate: Date | null; centre: string | null; remindedFor: Date | null };
  vignette: { paidDate: Date | null; nextDueDate: Date | null; remindedFor: Date | null };
  notes: string | null;
}

export interface Vehicle {
  ownerId: Types.ObjectId;
  brand: string;
  model: string;
  color: string;
  /** PRIVATE. Never rendered on any public route. */
  plateNumber?: string | null;
  /** Controls whether brand/model/colour are shown on /t/[tagId]. */
  showDetailsPublicly: boolean;
  isActive: boolean;
  /** Absent on cars whose owner has not opened the car book yet. */
  care?: VehicleCare;
  createdAt: Date;
  updatedAt: Date;
}

const nullable = <T>(type: T) => ({ type, default: null });

const vehicleSchema = new Schema<Vehicle>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Empty until the owner describes the car: a sticker is linked first (lib/vehicles/carName.ts).
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    plateNumber: { type: String, trim: true, default: null },
    showDetailsPublicly: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    care: {
      year: nullable(Number),
      fuel: { type: String, enum: [...CAR_FUELS, null], default: null },
      engine: nullable(String),
      vin: nullable(String),
      registrationNumber: nullable(String),
      insurance: {
        company: nullable(String),
        policyNumber: nullable(String),
        startDate: nullable(Date),
        expiryDate: nullable(Date),
        remindedFor: nullable(Date),
      },
      inspection: {
        lastDate: nullable(Date),
        nextDueDate: nullable(Date),
        centre: nullable(String),
        remindedFor: nullable(Date),
      },
      vignette: { paidDate: nullable(Date), nextDueDate: nullable(Date), remindedFor: nullable(Date) },
      notes: nullable(String),
    },
  },
  { timestamps: true, collection: 'vehicles' },
);

// The daily reminder looks for due dates inside its horizon; most cars have none.
for (const path of ['care.insurance.expiryDate', 'care.inspection.nextDueDate', 'care.vignette.nextDueDate']) {
  vehicleSchema.index({ [path]: 1 }, { partialFilterExpression: { [path]: { $type: 'date' } } });
}

export const VehicleModel: Model<Vehicle> =
  (models.Vehicle as Model<Vehicle> | undefined) ?? model<Vehicle>('Vehicle', vehicleSchema);
