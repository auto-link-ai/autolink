import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Sticker template + designer artwork are read from disk at runtime by the batch routes.
// The logo SVGs are read the same way, by the print code and the social card.
const BRAND_FILES = ['./public/brand/*.svg'];
const PRINT_FILES = ['./print/sticker/**/*', ...BRAND_FILES];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Two dev servers sharing one build directory corrupt each other's chunks.
  // The e2e run sets this so it never collides with a `pnpm dev` left open.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Pin the workspace root to this project; a lockfile in a parent folder would
  // otherwise be picked up as the root.
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    '/api/admin/batches': PRINT_FILES,
    '/api/admin/batches/[publicId]/reissue': PRINT_FILES,
    '/[locale]/opengraph-image': BRAND_FILES,
  },
};

export default withNextIntl(nextConfig);
