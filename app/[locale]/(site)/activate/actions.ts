'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { toLocale } from '@/i18n/locales';
import { claimTag } from '@/lib/activation/claim';
import { getOwnerSession } from '@/lib/auth/session';
import { getClientIp, hashIp } from '@/lib/security/ipHash';
import { fieldErrors } from '@/lib/validation/auth';
import { vehicleSchema, type VehicleField } from '@/lib/validation/vehicle';
import type { ActivateFormState } from './state';

/**
 * Claims a sticker for the signed-in customer. The tag id and code come from
 * the claim QR (or are typed from the slip); everything is re-checked here.
 */
export async function activateAction(_prev: ActivateFormState, formData: FormData): Promise<ActivateFormState> {
  const locale = toLocale(formData.get('locale'));
  const session = await getOwnerSession();
  if (!session) {
    const next = `/${locale}/activate`;
    redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
  }

  const vehicle = vehicleSchema.safeParse({
    brand: formData.get('brand') ?? '',
    model: formData.get('model') ?? '',
    color: formData.get('color') ?? '',
    plateNumber: formData.get('plateNumber') ?? '',
    showDetailsPublicly: formData.get('showDetailsPublicly') ?? undefined,
  });
  if (!vehicle.success) {
    return { status: 'error', fieldErrors: fieldErrors<VehicleField>(vehicle.error) };
  }

  let outcome;
  try {
    outcome = await claimTag(
      session.actor,
      {
        tagId: String(formData.get('tagId') ?? ''),
        code: String(formData.get('code') ?? ''),
        vehicle: vehicle.data,
      },
      { ipHash: hashIp(getClientIp(await headers())) },
    );
  } catch (error) {
    console.error('[activate] failed:', error instanceof Error ? error.message : error);
    return { status: 'error', formError: 'server_error' };
  }

  if (!outcome.ok) return { status: 'error', formError: outcome.reason };
  redirect(`/${locale}/dashboard?activated=${outcome.publicTagId}`);
}
