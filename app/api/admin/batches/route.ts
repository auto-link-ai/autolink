import { z } from 'zod';
import { getAdminSession } from '@/lib/admin/auth';
import { BATCH_LIMITS } from '@/lib/domain/constants';
import { isSameOrigin } from '@/lib/security/origin';
import { batchErrorResponse, jsonError, zipResponse } from '@/lib/tags/batchHttp';
import { createTagBatch } from '@/lib/tags/batchService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const inputSchema = z.object({
  label: z.string().trim().min(1).max(BATCH_LIMITS.maxLabelLength),
  quantity: z.number().int().min(1).max(BATCH_LIMITS.maxQuantity),
});

/** Creates a tag batch and returns its print ZIP: the stickers to print. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError('forbidden', 403);
  const session = await getAdminSession();
  if (!session) return jsonError('unauthorized', 401);

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError('invalid_input', 400);

  try {
    return zipResponse(await createTagBatch(session.actor, parsed.data));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
