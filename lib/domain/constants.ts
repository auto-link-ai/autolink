/**
 * Domain enums shared by models, validation and UI.
 * Plain data only — safe to import from client and server code.
 */

export const USER_STATUSES = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TAG_STATUSES = ['UNASSIGNED', 'ACTIVE', 'DEACTIVATED', 'SUSPENDED', 'LOST'] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

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
