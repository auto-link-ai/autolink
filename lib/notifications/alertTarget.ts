import { isValidTagIdShape, TAG_ID_BODY_LENGTH, TAG_ID_PREFIX } from '@/lib/validation/tagId';

/**
 * Where a WhatsApp button's /alert/{id} leads. A reminder carries the sticker,
 * so it opens that car's book; a message alert carries the message, so it
 * opens the inbox. The id's shape decides — nothing is looked up, so the
 * answer says nothing about what exists or whose it is (the car book itself
 * checks ownership).
 *
 * Only the end of the id is read: a template whose button was saved with a
 * stray placeholder before the variable (« …/alert/%7B%7B1%7D%7D{{1}} ») still
 * lands in the right place.
 */
export function alertTarget(locale: string, id: string): string {
  const tail = id.slice(-(TAG_ID_PREFIX.length + TAG_ID_BODY_LENGTH));
  return isValidTagIdShape(tail) ? `/${locale}/dashboard/car/${tail}` : `/${locale}/dashboard`;
}
