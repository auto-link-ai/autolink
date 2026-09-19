import { getAdminSession } from '@/lib/admin/auth';
import { isSameOrigin } from '@/lib/security/origin';
import { batchErrorResponse, jsonError, zipResponse } from '@/lib/tags/batchHttp';
import { reissueBatchCodes } from '@/lib/tags/batchService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH_PUBLIC_ID = /^B-[0-9A-HJKMNP-TV-Z]{8}$/;

/** New activation codes for a batch's still-unassigned tags, returned as a fresh ZIP. */
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  if (!isSameOrigin(request)) return jsonError('forbidden', 403);
  const session = await getAdminSession();
  if (!session) return jsonError('unauthorized', 401);

  const { publicId } = await params;
  if (!BATCH_PUBLIC_ID.test(publicId)) return jsonError('not_found', 404);

  try {
    return zipResponse(await reissueBatchCodes(session.actor, publicId));
  } catch (error) {
    return batchErrorResponse(error);
  }
}
