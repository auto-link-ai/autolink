import 'server-only';
import { wilayasRepository, type WilayaDTO } from '@/lib/db/repositories/wilayas';

/**
 * The 58 wilayas, kept in memory. They are seeded reference data that changes
 * about never, yet the order page, the admin and every order read them — one
 * database round trip each time. Cached like lib/config/settings.ts, with a
 * longer life; a seed change shows up within the hour, or on the next deploy.
 */
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = { value: Promise<WilayaDTO[]>; loadedAt: number };

const globalForWilayas = globalThis as typeof globalThis & {
  __autolinkWilayasCache?: CacheEntry | null;
};

export async function getWilayas(): Promise<WilayaDTO[]> {
  const entry = globalForWilayas.__autolinkWilayasCache;
  if (entry && Date.now() - entry.loadedAt < CACHE_TTL_MS) return entry.value;

  // Cache the promise, not the value, so concurrent readers share one read.
  const value = wilayasRepository.list();
  globalForWilayas.__autolinkWilayasCache = { value, loadedAt: Date.now() };

  try {
    return await value;
  } catch (error) {
    globalForWilayas.__autolinkWilayasCache = null;
    throw error;
  }
}

export type { WilayaDTO };
