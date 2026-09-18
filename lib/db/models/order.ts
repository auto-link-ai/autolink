import 'server-only';
import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  DELIVERY_TYPES,
  ORDER_STATUSES,
  STORAGE_LIMITS,
  WILAYA_CODE_MAX,
  WILAYA_CODE_MIN,
  type DeliveryType,
  type OrderStatus,
} from '@/lib/domain/constants';

export interface Order {
  /** 'AT-' + 6 chars, shown to the customer. */
  orderRef: string;
  customerName: string;
  /** Normalized DZ mobile, 0XXXXXXXXX. */
  phone: string;
  email: string | null;
  wilayaCode: number;
  commune: string;
  address: string;
  deliveryType: DeliveryType;
  deliveryNotes: string | null;
  quantity: number;
  /** DZD snapshots taken from settings at order time. */
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  /** Filled by admin at packing time. Ordering does not reserve tags. */
  assignedTagIds: Types.ObjectId[];
  courier: string | null;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<Order>(
  {
    orderRef: { type: String, required: true, unique: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    wilayaCode: { type: Number, required: true, min: WILAYA_CODE_MIN, max: WILAYA_CODE_MAX },
    commune: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    deliveryType: { type: String, enum: DELIVERY_TYPES, required: true },
    deliveryNotes: { type: String, trim: true, default: null },
    // Effective maximum comes from settings.maxOrderQuantity; this is the storage ceiling.
    quantity: { type: Number, required: true, min: 1, max: STORAGE_LIMITS.orderQuantity },
    unitPrice: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
    assignedTagIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Tag' }], default: [] },
    courier: { type: String, trim: true, default: null },
    trackingNumber: { type: String, trim: true, default: null },
  },
  { timestamps: true, collection: 'orders' },
);

export const OrderModel: Model<Order> =
  (models.Order as Model<Order> | undefined) ?? model<Order>('Order', orderSchema);
