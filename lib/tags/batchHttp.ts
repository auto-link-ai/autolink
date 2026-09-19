import 'server-only';
import { BatchError, type BatchDownload } from './batchService';

/** JSON error body the admin UI maps to translated copy. Never a raw error. */
export function jsonError(error: string, status: number, detail?: string): Response {
  return Response.json(detail ? { error, detail } : { error }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export function zipResponse(download: BatchDownload): Response {
  return new Response(new Blob([download.zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${download.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function batchErrorResponse(error: unknown): Response {
  if (error instanceof BatchError) return jsonError(error.code, error.status, error.detail);
  console.error('[admin/batches] unexpected error', error);
  return jsonError('server_error', 500);
}
