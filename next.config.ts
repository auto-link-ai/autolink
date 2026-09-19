import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Sticker template + designer artwork are read from disk at runtime by the batch routes.
const PRINT_FILES = ['./print/sticker/**/*'];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Pin the workspace root to this project; a lockfile in a parent folder would
  // otherwise be picked up as the root.
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    '/api/admin/batches': PRINT_FILES,
    '/api/admin/batches/[publicId]/reissue': PRINT_FILES,
  },
};

export default withNextIntl(nextConfig);
