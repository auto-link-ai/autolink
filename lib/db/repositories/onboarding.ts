/**
 * Repository: onboarding — the account and the sticker, together
 *
 * SECURITY BOUNDARY — only repositories import models. Called once the
 * WhatsApp code has proven the phone (lib/activation/onboard.ts): the phone,
 * the sticker and the details come from the verified challenge, never from a
 * form. The owner id it returns stays on the server: it becomes the session's
 * subject, as at every sign-in.
 */
import 'server-only';
import type { Locale } from '@/i18n/locales';
import { connectToDatabase } from '@/lib/db/connect';
import { UserModel } from '@/lib/db/models/user';
import { generatePublicUserId } from '@/lib/tags/generate';
import { claimWithin, StickerTakenError } from './tagsOwner';
import type { NewVehicle } from './vehicles';

export interface NewOwner {
  firstName: string;
  lastName: string;
  phone: string;
  pinHash: string;
  locale: Locale;
}

export type OnboardResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; reason: 'taken' | 'blocked' };

function isDuplicatePhone(error: unknown): boolean {
  const e = error as { code?: unknown; keyPattern?: Record<string, unknown> } | null;
  return Boolean(e && e.code === 11000 && e.keyPattern && 'phone' in e.keyPattern);
}

async function activateOnce(
  owner: NewOwner,
  publicTagId: string,
  vehicle: NewVehicle,
  servicePeriodMonths: number,
): Promise<OnboardResult> {
  const mongoose = await connectToDatabase();
  let result: OnboardResult = { ok: false, reason: 'taken' };
  await mongoose.connection.transaction(async (session) => {
    // The callback can run again on a transient error: decide everything afresh.
    result = { ok: false, reason: 'taken' };
    const existing = await UserModel.findOne({ phone: owner.phone }, { status: 1 }).session(session).lean();
    if (existing && existing.status !== 'ACTIVE') {
      result = { ok: false, reason: 'blocked' };
      return;
    }
    let userId = existing?._id.toString();
    if (!userId) {
      const [doc] = await UserModel.create([{ ...owner, publicUserId: generatePublicUserId() }], { session });
      if (!doc) throw new Error('onboarding: the account was not created');
      userId = doc._id.toString();
    }
    await claimWithin(session, { kind: 'owner', userId }, publicTagId, vehicle, servicePeriodMonths);
    result = { ok: true, userId, created: !existing };
  });
  return result;
}

export const onboardingRepository = {
  /**
   * The new account — or the one this number already has — and the sticker
   * with its car, in one transaction. A sticker someone else won throws inside
   * it, so a new account is rolled back with it: no account without a sticker.
   * The sticker's service runs `servicePeriodMonths` from now (settings).
   */
  async activate(
    owner: NewOwner,
    publicTagId: string,
    vehicle: NewVehicle,
    servicePeriodMonths: number,
  ): Promise<OnboardResult> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await activateOnce(owner, publicTagId, vehicle, servicePeriodMonths);
      } catch (error) {
        if (error instanceof StickerTakenError) return { ok: false, reason: 'taken' };
        // Two activations for one new number at once: the loser goes round
        // again and finds the account the winner just made.
        if (isDuplicatePhone(error) && attempt === 0) continue;
        throw error;
      }
    }
  },
};
