import 'server-only';
import { settingsRepository, type AppSettings } from '@/lib/db/repositories/settings';

export type { AppSettings };

/**
 * The single entry point for price, fees, limits and retention (rule 5).
 * Values are cached per server instance for 60s; an admin change therefore
 * reaches every instance within a minute. Admin writes call
 * `invalidateSettingsCache()` so the instance that made the change sees it at once.
 */
const CACHE_TTL_MS = 60_000;

type CacheEntry = { value: Promise<AppSettings>; loadedAt: number };

const globalForSettings = globalThis as typeof globalThis & {
  __autotagSettingsCache?: CacheEntry | null;
};

export async function getSettings(): Promise<AppSettings> {
  const entry = globalForSettings.__autotagSettingsCache;
  if (entry && Date.now() - entry.loadedAt < CACHE_TTL_MS) {
    return entry.value;
  }

  // Cache the promise, not the value, so concurrent callers share one read.
  const value = settingsRepository.getOrCreateGlobal();
  globalForSettings.__autotagSettingsCache = { value, loadedAt: Date.now() };

  try {
    return await value;
  } catch (error) {
    globalForSettings.__autotagSettingsCache = null;
    throw error;
  }
}

export function invalidateSettingsCache(): void {
  globalForSettings.__autotagSettingsCache = null;
}
