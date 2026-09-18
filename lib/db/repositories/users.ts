/**
 * Repository: users (vehicle owners)
 *
 * SECURITY BOUNDARY — MongoDB has no row-level security; this module is the only
 * code allowed to touch UserModel. Every owner-facing function takes an
 * `OwnerActor` and reads/writes only `_id: actor.userId`. Lookups by email exist
 * solely for the login/registration path. `passwordHash` is never returned.
 * Returned objects never include `_id`.
 *
 * Functions are added in Phase 3 (auth, activation).
 */
import 'server-only';
import type { Locale } from '@/i18n/locales';
import type { UserStatus } from '@/lib/domain/constants';

export interface UserDTO {
  email: string;
  name: string | null;
  phone: string | null;
  locale: Locale;
  emailNotifications: boolean;
  emailVerified: boolean;
  status: UserStatus;
}
