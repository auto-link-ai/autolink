/**
 * Repository: vehicles
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch VehicleModel. Every owner-facing function takes an
 * `OwnerActor` and filters by `ownerId: actor.userId`; a vehicle that belongs to
 * someone else is indistinguishable from one that does not exist.
 * The plate number is only ever returned in `VehicleDTO` (owner view), never in
 * `PublicVehicleView`. Returned objects never include `_id`.
 *
 * Functions are added in Phase 3 (activation, /dashboard/vehicle).
 */
import 'server-only';

/** Owner's own view of their vehicle. */
export interface VehicleDTO {
  brand: string;
  model: string;
  color: string;
  plateNumber: string | null;
  showDetailsPublicly: boolean;
  isActive: boolean;
}

/**
 * The ONLY vehicle shape allowed on /t/[tagId], and only when
 * `showDetailsPublicly` is true. No plate, no owner fields.
 */
export type PublicVehicleView = Pick<VehicleDTO, 'brand' | 'model' | 'color'>;
