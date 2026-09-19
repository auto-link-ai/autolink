/**
 * Domain enums shared by models, validation and UI.
 * Plain data only — safe to import from client and server code.
 */

export const USER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TAG_STATUSES = ['UNASSIGNED', 'ACTIVE', 'DEACTIVATED', 'SUSPENDED', 'LOST'] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

/** Admin actions on a tag's status (see lib/tags/transitions.ts for the rules). */
export const TAG_ACTIONS = ['suspend', 'deactivate', 'reactivate', 'markLost'] as const;
export type TagAction = (typeof TAG_ACTIONS)[number];

/** Tag batch generation limits. Kept small so a batch (hashing + ZIP) fits one function call. */
export const BATCH_LIMITS = { maxQuantity: 100, maxLabelLength: 60 } as const;

export const MESSAGE_CATEGORIES = [
  'LIGHTS_ON',
  'BLOCKING_ACCESS',
  'VEHICLE_PROBLEM',
  'POSSIBLE_DAMAGE',
  'URGENT',
  'OTHER',
] as const;
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];

export const MESSAGE_STATUSES = ['UNREAD', 'READ', 'ARCHIVED'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['PUSH', 'EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_ATTEMPT_STATUSES = ['SENT', 'FAILED', 'SKIPPED'] as const;
export type NotificationAttemptStatus = (typeof NOTIFICATION_ATTEMPT_STATUSES)[number];

export const DELIVERY_TYPES = ['HOME', 'STOPDESK'] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Admin actions on an order's status (see lib/orders/transitions.ts for the rules). */
export const ORDER_ACTIONS = ['confirm', 'prepare', 'ship', 'deliver', 'cancel'] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

/** Order form field limits (characters). Quantity limits come from settings. */
export const ORDER_FIELD_LIMITS = {
  name: { min: 2, max: 80 },
  commune: { min: 2, max: 80 },
  address: { min: 5, max: 200 },
  notes: { max: 300 },
  email: { max: 254 },
  courier: { max: 60 },
  trackingNumber: { max: 60 },
} as const;

/** 'AL-' + 6 Crockford base32 characters, shown to the customer. */
export const ORDER_REF_PATTERN = /^AL-[0-9A-HJKMNP-TV-Z]{6}$/;

export const ADMIN_ROLES = ['ADMIN', 'SUPPORT'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const AUDIT_ACTOR_TYPES = ['ADMIN', 'SYSTEM'] as const;
export type AuditActorType = (typeof AUDIT_ACTOR_TYPES)[number];

/**
 * Storage ceilings. These are absolute upper bounds enforced by the schema so a
 * misconfigured setting can never write unbounded data. The *effective* limits
 * (e.g. `maxMessageLength`, `maxOrderQuantity`) come from the settings document.
 */
export const STORAGE_LIMITS = {
  messageBody: 1000,
  scannerContact: 120,
  orderQuantity: 100,
} as const;

/** Algeria has 58 wilayas (codes 1–58). */
export const WILAYA_CODE_MIN = 1;
export const WILAYA_CODE_MAX = 58;
