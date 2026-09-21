/** Result of saving a push subscription, outside the "use server" file. */
export interface SavePushResult {
  ok: boolean;
  /** Set when a test notification was asked for: whether it reached the push service. */
  confirmed?: boolean;
}
