import { z } from 'zod';
import { MESSAGE_CATEGORIES, STORAGE_LIMITS } from '@/lib/domain/constants';

/**
 * What someone who scanned a sticker may send. Error messages are stable codes
 * the page maps to translated copy, like the other forms.
 *
 * The body's real limit is `maxMessageLength` from settings (rule 5), so the
 * schema is built per request; the constant here is only the storage ceiling.
 */
export function messageSchema(maxBodyLength: number) {
  const max = Math.min(maxBodyLength, STORAGE_LIMITS.messageBody);
  return z.object({
    category: z.enum(MESSAGE_CATEGORIES, { message: 'invalid_category' }),
    /**
     * Optional. Someone in a hurry taps "Lights are on" and sends — that is a
     * complete report, and the owner's inbox leads with the category anyway.
     */
    body: z.string().trim().max(max, 'too_long'),
    /**
     * Optional: a phone or an email the owner can answer on. Kept as typed —
     * it is the sender's to give, and the owner is the only one who sees it.
     */
    scannerContact: z
      .string()
      .trim()
      .max(STORAGE_LIMITS.scannerContact, 'too_long')
      .transform((value) => (value === '' ? null : value)),
  });
}

export type MessageInput = z.infer<ReturnType<typeof messageSchema>>;
export type MessageField = keyof MessageInput;
