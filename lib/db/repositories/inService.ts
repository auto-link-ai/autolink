import 'server-only';

/**
 * The part of a tag filter that says "its paid service has not ended". Every
 * query that lets a stranger reach the owner adds it next to `status: 'ACTIVE'`,
 * so an expired sticker falls into the same "not available" answer as a
 * deactivated one (rule 9). A tag with no end date yet was linked before
 * service periods existed: it keeps working until the backfill dates it.
 */
export function inService(now: Date = new Date()) {
  return { $or: [{ serviceUntil: null }, { serviceUntil: { $gt: now } }] };
}
