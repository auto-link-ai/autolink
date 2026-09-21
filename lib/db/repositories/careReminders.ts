/**
 * Repository: car book reminders — SYSTEM ONLY (the daily cron)
 *
 * SECURITY BOUNDARY — only repositories import models. Takes a `SystemActor`;
 * never reachable from a page. It returns what is due for whom; the internal
 * `ref` it hands back is only ever passed back to `markReminded`, never out of
 * the server, and the cron route answers with counts alone.
 *
 * A reminder is "due" when its date is inside the horizon (overdue included)
 * and it has not been sent for that exact date yet. Blocked accounts get none.
 */
import 'server-only';
import type { Types } from 'mongoose';
import type { Locale } from '@/i18n/locales';
import { connectToDatabase } from '@/lib/db/connect';
import { ServiceRecordModel } from '@/lib/db/models/serviceRecord';
import { TagModel } from '@/lib/db/models/tag';
import { UserModel } from '@/lib/db/models/user';
import { VehicleModel, type Vehicle } from '@/lib/db/models/vehicle';
import type { CareDueKind } from '@/lib/domain/constants';
import type { SystemActor } from './actor';

export interface DueReminder {
  kind: CareDueKind;
  /** Internal: the car (or, for an oil change, the log entry) to mark afterwards. */
  ref: Types.ObjectId;
  userId: string;
  locale: Locale;
  publicTagId: string;
  carLabel: string;
  dueDate: Date;
}

type Candidate = Omit<DueReminder, 'userId' | 'locale' | 'publicTagId' | 'carLabel'> & {
  vehicleId: Types.ObjectId;
  ownerId: Types.ObjectId;
};

const VEHICLE_DUES = [
  { kind: 'INSURANCE', path: 'care.insurance.expiryDate', pick: (v: Vehicle) => v.care?.insurance },
  { kind: 'INSPECTION', path: 'care.inspection.nextDueDate', pick: (v: Vehicle) => v.care?.inspection },
  { kind: 'VIGNETTE', path: 'care.vignette.nextDueDate', pick: (v: Vehicle) => v.care?.vignette },
] as const;

const REMINDED_PATH: Record<Exclude<CareDueKind, 'OIL_CHANGE'>, string> = {
  INSURANCE: 'care.insurance.remindedFor',
  INSPECTION: 'care.inspection.remindedFor',
  VIGNETTE: 'care.vignette.remindedFor',
};

const same = (a: Date | null | undefined, b: Date) => a?.getTime() === b.getTime();

async function vehicleCandidates(horizon: Date): Promise<Candidate[]> {
  const vehicles = await VehicleModel.find(
    { $or: VEHICLE_DUES.map(({ path }) => ({ [path]: { $ne: null, $lte: horizon } })) },
    { ownerId: 1, care: 1 },
  ).lean();

  const out: Candidate[] = [];
  for (const vehicle of vehicles) {
    for (const { kind, pick } of VEHICLE_DUES) {
      const part = pick(vehicle);
      const dueDate = part && ('expiryDate' in part ? part.expiryDate : part.nextDueDate);
      if (!dueDate || dueDate > horizon || same(part.remindedFor, dueDate)) continue;
      out.push({ kind, ref: vehicle._id, vehicleId: vehicle._id, ownerId: vehicle.ownerId, dueDate });
    }
  }
  return out;
}

/** Only the latest oil change of each car counts: its "next change" is the current one. */
async function oilCandidates(horizon: Date): Promise<Candidate[]> {
  const latest = await ServiceRecordModel.aggregate<{
    _id: Types.ObjectId;
    recordId: Types.ObjectId;
    ownerId: Types.ObjectId;
    nextDueDate: Date | null;
    remindedFor: Date | null;
  }>([
    { $match: { kind: 'OIL_CHANGE' } },
    { $sort: { vehicleId: 1, date: -1, createdAt: -1 } },
    {
      $group: {
        _id: '$vehicleId',
        recordId: { $first: '$_id' },
        ownerId: { $first: '$ownerId' },
        nextDueDate: { $first: '$nextDueDate' },
        remindedFor: { $first: '$remindedFor' },
      },
    },
    { $match: { nextDueDate: { $ne: null, $lte: horizon } } },
  ]);
  return latest
    .filter((oil) => oil.nextDueDate && !same(oil.remindedFor, oil.nextDueDate))
    .map((oil) => ({
      kind: 'OIL_CHANGE' as const,
      ref: oil.recordId,
      vehicleId: oil._id,
      ownerId: oil.ownerId,
      dueDate: oil.nextDueDate!,
    }));
}

export const careRemindersRepository = {
  async findDue(_system: SystemActor, horizon: Date): Promise<DueReminder[]> {
    await connectToDatabase();
    const candidates = [...(await vehicleCandidates(horizon)), ...(await oilCandidates(horizon))];
    if (candidates.length === 0) return [];

    const [users, tags, vehicles] = await Promise.all([
      UserModel.find({ _id: { $in: candidates.map((c) => c.ownerId) }, status: 'ACTIVE' }, { locale: 1 }).lean(),
      TagModel.find({ vehicleId: { $in: candidates.map((c) => c.vehicleId) } }, { publicTagId: 1, vehicleId: 1 }).lean(),
      VehicleModel.find({ _id: { $in: candidates.map((c) => c.vehicleId) } }, { brand: 1, model: 1 }).lean(),
    ]);
    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    const tagByVehicle = new Map(tags.map((tag) => [tag.vehicleId!.toString(), tag.publicTagId]));
    const labelByVehicle = new Map(vehicles.map((v) => [v._id.toString(), `${v.brand} ${v.model}`]));

    return candidates.flatMap((candidate) => {
      const user = userById.get(candidate.ownerId.toString());
      const publicTagId = tagByVehicle.get(candidate.vehicleId.toString());
      const carLabel = labelByVehicle.get(candidate.vehicleId.toString());
      if (!user || !publicTagId || !carLabel) return [];
      return [
        {
          kind: candidate.kind,
          ref: candidate.ref,
          userId: user._id.toString(),
          locale: user.locale,
          publicTagId,
          carLabel,
          dueDate: candidate.dueDate,
        },
      ];
    });
  },

  /** Records the date reminded for, so the same due date is never sent twice. */
  async markReminded(_system: SystemActor, reminder: DueReminder): Promise<void> {
    await connectToDatabase();
    if (reminder.kind === 'OIL_CHANGE') {
      await ServiceRecordModel.updateOne({ _id: reminder.ref }, { $set: { remindedFor: reminder.dueDate } });
      return;
    }
    await VehicleModel.updateOne({ _id: reminder.ref }, { $set: { [REMINDED_PATH[reminder.kind]]: reminder.dueDate } });
  },
};
