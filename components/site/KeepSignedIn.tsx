'use client';

import { useEffect } from 'react';
import { localDay, RENEWED_ON_KEY, shouldRenew } from '@/lib/auth/renewal';

/**
 * Keeps a signed-in owner signed in. Pages only read the sign-in, so nothing
 * would ever extend it; once a day this asks Auth.js's own session endpoint,
 * which re-issues the cookie for another 400 days (auth.ts). Renders nothing,
 * and a failure changes nothing: the next day tries again.
 */
export function KeepSignedIn() {
  useEffect(() => {
    const today = localDay();
    let renewedOn: string | null = null;
    try {
      renewedOn = localStorage.getItem(RENEWED_ON_KEY);
    } catch {
      // No storage (private browsing): renewing on every page is fine.
    }
    if (!shouldRenew(renewedOn, today)) return;

    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => {
        if (!response.ok) return;
        try {
          localStorage.setItem(RENEWED_ON_KEY, today);
        } catch {
          // Nothing to remember it in: it will simply renew again next time.
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
