/**
 * Repository: phoneCodes (WhatsApp verification challenges)
 *
 * SECURITY BOUNDARY — only repositories import models. A challenge is reached
 * only through its unguessable `publicId`, and every read also matches the
 * purpose, so a reset challenge can never finish an activation. Live means:
 * not consumed and not expired. Returned objects never include `_id`; the code
 * hash leaves this module only for the one comparison in lib/auth/codes.ts.
 */
import 'server-only';
import { connectToDatabase } from '@/lib/db/connect';
import { PhoneCodeModel, type ActivationDetails } from '@/lib/db/models/phoneCode';
import type { PhoneCodePurpose } from '@/lib/domain/constants';

export type { ActivationDetails };

export interface NewChallenge {
  publicId: string;
  phone: string;
  purpose: PhoneCodePurpose;
  tagId: string | null;
  details: ActivationDetails | null;
  codeHash: string;
  decoy: boolean;
  expiresAt: Date;
}

export interface Challenge {
  phone: string;
  tagId: string | null;
  details: ActivationDetails | null;
  decoy: boolean;
}

const PUBLIC = { _id: 0, phone: 1, tagId: 1, details: 1, decoy: 1 } as const;

function toChallenge(doc: { phone: string; tagId?: string | null; details?: ActivationDetails | null; decoy?: boolean }): Challenge {
  return {
    phone: doc.phone,
    tagId: doc.tagId ?? null,
    details: doc.details
      ? {
          firstName: doc.details.firstName,
          lastName: doc.details.lastName,
          brand: doc.details.brand,
          model: doc.details.model,
          locale: doc.details.locale,
        }
      : null,
    decoy: doc.decoy ?? false,
  };
}

export const phoneCodesRepository = {
  async create(challenge: NewChallenge): Promise<void> {
    await connectToDatabase();
    await PhoneCodeModel.create({ ...challenge, attempts: 0, consumedAt: null });
  },

  /** A live challenge, for resending its code. */
  async findLive(publicId: string, purpose: PhoneCodePurpose, now: Date = new Date()): Promise<Challenge | null> {
    await connectToDatabase();
    const doc = await PhoneCodeModel.findOne(
      { publicId, purpose, consumedAt: null, expiresAt: { $gt: now } },
      PUBLIC,
    ).lean();
    return doc ? toChallenge(doc) : null;
  },

  /**
   * Spends one attempt and returns the challenge with its code hash — in one
   * atomic update, so parallel guesses cannot slip past `maxAttempts`. Null once
   * the challenge is used up, expired, or out of attempts.
   */
  async spendAttempt(
    publicId: string,
    purpose: PhoneCodePurpose,
    maxAttempts: number,
    now: Date = new Date(),
  ): Promise<(Challenge & { codeHash: string }) | null> {
    await connectToDatabase();
    const doc = await PhoneCodeModel.findOneAndUpdate(
      { publicId, purpose, consumedAt: null, expiresAt: { $gt: now }, attempts: { $lt: maxAttempts } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after', projection: { ...PUBLIC, codeHash: 1 }, lean: true },
    );
    return doc ? { ...toChallenge(doc), codeHash: doc.codeHash } : null;
  },

  /** Marks the challenge used. True only for the first caller: a code works once. */
  async consume(publicId: string, now: Date = new Date()): Promise<boolean> {
    await connectToDatabase();
    const result = await PhoneCodeModel.updateOne({ publicId, consumedAt: null }, { $set: { consumedAt: now } });
    return result.modifiedCount === 1;
  },

  /** A new code for a live challenge ("send it again"): fresh hash, attempts and expiry. */
  async replaceCode(publicId: string, purpose: PhoneCodePurpose, codeHash: string, expiresAt: Date): Promise<boolean> {
    await connectToDatabase();
    const result = await PhoneCodeModel.updateOne(
      { publicId, purpose, consumedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { codeHash, expiresAt, attempts: 0 } },
    );
    return result.modifiedCount === 1;
  },
};
