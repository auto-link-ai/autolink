import 'server-only';
import type { AdminActor } from '@/lib/db/repositories/actor';
import { tagBatchesRepository } from '@/lib/db/repositories/tagBatches';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { buildBatchZip, type BatchPrintEntry } from '@/lib/print/batchZip';
import { PrintTemplateError, loadPrintTemplate, type PrintTemplate } from '@/lib/print/template';
import { generateBatchPublicId, generateTagId, generateUniqueTagIds } from './generate';
import { resolveQrBaseUrl, tagUrl, type QrBaseUrlProblem } from './tagUrl';

/**
 * Tag batch generation: the stickers to print, nothing else. There is no
 * activation code — whoever scans a sticker first and signs in links it.
 */
export type BatchErrorCode = QrBaseUrlProblem | 'template_invalid' | 'conflict' | 'forbidden_role';

export class BatchError extends Error {
  constructor(
    readonly code: BatchErrorCode,
    readonly status: number,
    /** Admin-facing detail (template problems only). Never a stack or DB error. */
    readonly detail?: string,
  ) {
    super(code);
  }
}

export interface BatchDownload {
  zip: Uint8Array;
  filename: string;
}

function requireAdminRole(admin: AdminActor): void {
  if (admin.role !== 'ADMIN') throw new BatchError('forbidden_role', 403);
}

function requireBaseUrl(): string {
  const resolved = resolveQrBaseUrl();
  if (!resolved.ok) throw new BatchError(resolved.problem, 400);
  return resolved.baseUrl;
}

async function withTemplateErrors<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PrintTemplateError) throw new BatchError('template_invalid', 500, error.message);
    throw error;
  }
}

function zipFilename(label: string, batchPublicId: string): string {
  const slug =
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'batch';
  return `autolink-${slug}-${batchPublicId}.zip`;
}

/** `count` tag IDs that exist neither in this batch nor in the database. */
async function freshTagIds(admin: AdminActor, count: number): Promise<string[]> {
  const ids = generateUniqueTagIds(count);
  for (let round = 0; round < 5; round++) {
    const taken = await tagsRepository.findExistingPublicTagIds(admin, ids);
    if (taken.size === 0) return ids;
    const inUse = new Set(ids);
    for (let i = 0; i < ids.length; i++) {
      if (!taken.has(ids[i] ?? '')) continue;
      let replacement = generateTagId();
      while (inUse.has(replacement)) replacement = generateTagId();
      inUse.add(replacement);
      ids[i] = replacement;
    }
  }
  throw new BatchError('conflict', 409);
}


export async function createTagBatch(
  admin: AdminActor,
  input: { label: string; quantity: number },
): Promise<BatchDownload> {
  requireAdminRole(admin);
  const baseUrl = requireBaseUrl();
  const template: PrintTemplate = await withTemplateErrors(() => loadPrintTemplate());

  // Retry only for the (astronomically unlikely) race where an id is taken between check and insert.
  for (let attempt = 0; attempt < 3; attempt++) {
    const ids = await freshTagIds(admin, input.quantity);
    const entries: BatchPrintEntry[] = ids.map((id) => ({ publicTagId: id, url: tagUrl(baseUrl, id) }));
    const batchPublicId = generateBatchPublicId();

    // Build the ZIP first: if rendering fails, nothing has been written.
    const zip = await withTemplateErrors(() =>
      buildBatchZip(template, entries, { label: input.label, batchPublicId, generatedAt: new Date() }),
    );
    const { created } = await tagBatchesRepository.createWithTags(admin, {
      publicId: batchPublicId,
      label: input.label,
      tags: entries.map((e) => ({ publicTagId: e.publicTagId })),
    });
    if (created) return { zip, filename: zipFilename(input.label, batchPublicId) };
  }
  throw new BatchError('conflict', 409);
}
