import 'server-only';
import mongoose from 'mongoose';

/**
 * Cached connection for serverless. Vercel may run many invocations in one warm
 * instance; caching the promise on globalThis makes them share one pool instead
 * of opening a new one per request (and survives dev hot reloads).
 */
type ConnectionCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __autolinkMongoose?: ConnectionCache;
};

const cache: ConnectionCache = (globalForMongoose.__autolinkMongoose ??= {
  conn: null,
  promise: null,
});

// A misspelled filter field must fail loudly, never silently match every document.
mongoose.set('strictQuery', 'throw');

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  }

  cache.promise ??= mongoose
    .connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || 'autolink',
      maxPoolSize: 10,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
      // In production, indexes are created by `pnpm seed` (syncAllIndexes), not on every cold start.
      autoIndex: process.env.NODE_ENV !== 'production',
    })
    .catch((error: unknown) => {
      cache.promise = null;
      throw error;
    });

  cache.conn = await cache.promise;
  return cache.conn;
}

/** For scripts only. Route handlers keep the pooled connection open. */
export async function disconnectFromDatabase(): Promise<void> {
  if (!cache.conn) return;
  await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
