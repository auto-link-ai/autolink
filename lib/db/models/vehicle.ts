import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';

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
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<Vehicle>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    plateNumber: { type: String, trim: true, default: null },
    showDetailsPublicly: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'vehicles' },
);

export const VehicleModel: Model<Vehicle> =
  (models.Vehicle as Model<Vehicle> | undefined) ?? model<Vehicle>('Vehicle', vehicleSchema);
