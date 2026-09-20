import 'server-only';
import { defaultLocale } from '@/i18n/locales';
import type { AdminActor } from '@/lib/db/repositories/actor';
import { tagBatchesRepository } from '@/lib/db/repositories/tagBatches';
import { tagsRepository } from '@/lib/db/repositories/tags';
import { buildBatchZip, type BatchPrintEntry } from '@/lib/print/batchZip';
import { PrintTemplateError, loadPrintTemplate, type PrintTemplate } from '@/lib/print/template';
import { hashSecret } from '@/lib/security/password';
import { generateActivationCode, generateBatchPublicId, generateTagId, generateUniqueTagIds } from './generate';
import { claimUrl, resolveQrBaseUrl, tagUrl, type QrBaseUrlProblem } from './tagUrl';

/**
 * Tag batch generation. Plaintext activation codes live only in memory here and
 * in the returned ZIP; the database only ever receives argon2id hashes.
 */
export type BatchErrorCode =
  | QrBaseUrlProblem
  | 'template_invalid'
  | 'conflict'
  | 'not_found'
  | 'nothing_to_reissue'
  | 'forbidden_role';

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

function zipFilename(label: string, batchPublicId: string, suffix = ''): string {
  const slug =
    label
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'batch';
  return `autolink-${slug}-${batchPublicId}${suffix}.zip`;
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

/** Both QRs for one tag: the public one for the sticker, the claim one for the slip. */
function printEntry(baseUrl: string, publicTagId: string, activationCode: string): BatchPrintEntry {
  return {
    publicTagId,
    activationCode,
    url: tagUrl(baseUrl, publicTagId),
    claimUrl: claimUrl(baseUrl, defaultLocale, publicTagId, activationCode),
  };
}

function printMeta(label: string, batchPublicId: string, baseUrl: string) {
  return { label, batchPublicId, activateAt: `${new URL(baseUrl).host}/activate`, generatedAt: new Date() };
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
    const entries: BatchPrintEntry[] = ids.map((id) => printEntry(baseUrl, id, generateActivationCode()));
    const batchPublicId = generateBatchPublicId();

    // Build the ZIP first: if rendering fails, nothing has been written.
    const zip = await withTemplateErrors(() =>
      buildBatchZip(template, entries, printMeta(input.label, batchPublicId, baseUrl)),
    );
    const hashes = await Promise.all(entries.map((e) => hashSecret(e.activationCode)));
    const { created } = await tagBatchesRepository.createWithTags(admin, {
      publicId: batchPublicId,
      label: input.label,
      tags: entries.map((e, i) => ({ publicTagId: e.publicTagId, activationCodeHash: hashes[i] ?? '' })),
    });
    if (created) return { zip, filename: zipFilename(input.label, batchPublicId) };
  }
  throw new BatchError('conflict', 409);
}

/**
 * Recovery path when a batch ZIP was lost: new codes for the batch's tags that
 * are STILL unassigned. Old codes stop working. Activated tags are never touched.
 */
export async function reissueBatchCodes(admin: AdminActor, batchPublicId: string): Promise<BatchDownload> {
  requireAdminRole(admin);
  const baseUrl = requireBaseUrl();
  const template = await withTemplateErrors(() => loadPrintTemplate());

  const batch = await tagBatchesRepository.findUnassignedTags(admin, batchPublicId);
  if (!batch) throw new BatchError('not_found', 404);
  if (batch.publicTagIds.length === 0) throw new BatchError('nothing_to_reissue', 409);

  const entries: BatchPrintEntry[] = batch.publicTagIds.map((id) =>
    printEntry(baseUrl, id, generateActivationCode()),
  );
  const hashes = await Promise.all(entries.map((e) => hashSecret(e.activationCode)));
  const updated = new Set(
    await tagBatchesRepository.replaceActivationHashes(
      admin,
      batchPublicId,
      entries.map((e, i) => ({ publicTagId: e.publicTagId, activationCodeHash: hashes[i] ?? '' })),
    ),
  );
  // Print only codes whose hash was actually stored.
  const issued = entries.filter((e) => updated.has(e.publicTagId));
  if (issued.length === 0) throw new BatchError('nothing_to_reissue', 409);

  const zip = await withTemplateErrors(() =>
    buildBatchZip(template, issued, printMeta(batch.label, batchPublicId, baseUrl)),
  );
  return { zip, filename: zipFilename(batch.label, batchPublicId, '-reissue') };
}
