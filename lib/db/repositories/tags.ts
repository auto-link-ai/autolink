/**
 * Repository: tags
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch TagModel.
 * - Owner functions take an `OwnerActor` and filter by `ownerId: actor.userId`.
 * - The public scanner lookup returns `PublicTagView | null` and nothing else:
 *   UNASSIGNED, DEACTIVATED, SUSPENDED, LOST and missing tags all return `null`,
 *   so callers cannot distinguish them (rule 9).
 * - `activationCodeHash` is `select: false` and never leaves this module.
 * Returned objects never include `_id`; tags are identified by `publicTagId`.
 *
 * Functions are added in Phase 1 (generation, admin) and Phase 2 (scanner lookup).
 */
import 'server-only';
import type { TagStatus } from '@/lib/domain/constants';
import type { PublicVehicleView } from './vehicles';

/** Owner/admin view of a tag. */
export interface TagDTO {
  publicTagId: string;
  status: TagStatus;
  activatedAt: Date | null;
}

/** What /t/[tagId] may know about an ACTIVE tag. */
export interface PublicTagView {
  publicTagId: string;
  vehicle: PublicVehicleView | null;
}
