import 'server-only';
import type { AdminRole } from '@/lib/domain/constants';

/**
 * Who is performing a data operation. Every repository function that touches
 * owner-scoped data takes one of these as its first argument and derives its
 * query filter from it — never from an id the client sent on its own.
 *
 * Actors are built on the server from a verified session, never from request input.
 */
export type OwnerActor = { readonly kind: 'owner'; readonly userId: string };
export type AdminActor = { readonly kind: 'admin'; readonly adminId: string; readonly role: AdminRole };
export type SystemActor = { readonly kind: 'system' };

/** An anonymous scanner on /t/[tagId]. Carries only the opaque session id and IP hash. */
export type ScannerActor = {
  readonly kind: 'scanner';
  readonly scannerSessionId: string;
  readonly ipHash: string;
};

export type Actor = OwnerActor | AdminActor | SystemActor | ScannerActor;
