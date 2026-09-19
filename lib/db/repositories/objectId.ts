import 'server-only';
import { Types } from 'mongoose';

/**
 * Parses a 24-hex id string. Invalid input returns null so callers treat it as
 * "not found" — never as a CastError that could leak into a response.
 */
export function toObjectId(id: string): Types.ObjectId | null {
  return /^[a-f0-9]{24}$/i.test(id) ? new Types.ObjectId(id) : null;
}
