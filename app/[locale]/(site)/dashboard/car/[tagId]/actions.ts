'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { toLocale } from '@/i18n/locales';
import { getOwnerSession } from '@/lib/auth/session';
import { carBookRepository } from '@/lib/db/repositories/carBook';
import { serviceRecordsRepository } from '@/lib/db/repositories/serviceRecords';
import { fieldErrors } from '@/lib/validation/auth';
import {
  CARE_SECTIONS,
  inspectionSchema,
  insuranceSchema,
  notesSchema,
  oilChangeSchema,
  profileSchema,
  repairSchema,
  vignetteSchema,
  type CareSection,
} from '@/lib/validation/carCare';
import type { CareFormState } from './careState';

type Schema = z.ZodObject<z.ZodRawShape>;

/**
 * Reads exactly the schema's fields from the form (everything is text), checks
 * them, and saves. A sticker that is not the signed-in owner's saves nothing.
 */
async function run<S extends Schema>(
  schema: S,
  formData: FormData,
  save: (input: z.output<S>) => Promise<{ ok: boolean }>,
): Promise<CareFormState> {
  const raw = Object.fromEntries(Object.keys(schema.shape).map((key) => [key, String(formData.get(key) ?? '')]));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors<string>(parsed.error) };
  const result = await save(parsed.data);
  return result.ok ? { status: 'saved' } : { status: 'error', formError: 'invalid' };
}

function isSection(value: unknown): value is CareSection {
  return typeof value === 'string' && (CARE_SECTIONS as readonly string[]).includes(value);
}

/** Every car book form posts here; `section` says which one. */
export async function saveCareAction(_prev: CareFormState, formData: FormData): Promise<CareFormState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const tagId = String(formData.get('tagId') ?? '');
  const section = formData.get('section');
  if (!isSection(section)) return { status: 'error', formError: 'invalid' };
  const owner = session.actor;

  try {
    const state = await {
      profile: () => run(profileSchema, formData, (input) => carBookRepository.saveDetails(owner, tagId, { section: 'profile', input })),
      insurance: () => run(insuranceSchema, formData, (input) => carBookRepository.saveDetails(owner, tagId, { section: 'insurance', input })),
      inspection: () => run(inspectionSchema, formData, (input) => carBookRepository.saveDetails(owner, tagId, { section: 'inspection', input })),
      vignette: () => run(vignetteSchema, formData, (input) => carBookRepository.saveDetails(owner, tagId, { section: 'vignette', input })),
      notes: () => run(notesSchema, formData, (input) => carBookRepository.saveDetails(owner, tagId, { section: 'notes', input })),
      oil: () => run(oilChangeSchema, formData, (input) => serviceRecordsRepository.add(owner, tagId, { kind: 'OIL_CHANGE', input })),
      repair: () => run(repairSchema, formData, (input) => serviceRecordsRepository.add(owner, tagId, { kind: 'REPAIR', input })),
    }[section]();

    if (state.status === 'saved') revalidatePath(`/${locale}/dashboard/car/${tagId}`);
    return state;
  } catch (error) {
    console.error('[care] save failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }
}

/** Deletes one oil change or repair entry. */
export async function deleteServiceRecordAction(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) redirect(`/${locale}/login`);

  const tagId = String(formData.get('tagId') ?? '');
  await serviceRecordsRepository.remove(session.actor, tagId, String(formData.get('recordId') ?? ''));
  revalidatePath(`/${locale}/dashboard/car/${tagId}`);
}
