import type { FullConfig } from '@playwright/test';

/**
 * `next dev` compiles a route the first time it is asked for. With several
 * workers starting at once, every one of them waits on a different cold
 * compile and some requests come back as errors. This asks for each route once,
 * one at a time, before any test runs.
 */
const ROUTES = [
  '/fr',
  '/ar',
  '/en',
  '/fr/order',
  '/en/login',
  '/en/register',
  '/en/dashboard',
  '/en/activate',
  '/en/admin/login',
  '/en/admin',
  '/en/admin/orders',
  '/en/admin/tags',
  '/en/admin/customers',
  '/en/admin/settings',
  '/robots.txt',
  '/sitemap.xml',
];

export default async function warmUp(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3100';
  for (const route of ROUTES) {
    try {
      await fetch(new URL(route, baseURL), { redirect: 'manual' });
    } catch {
      // The suite's own assertions report a server that is not answering.
    }
  }
}
