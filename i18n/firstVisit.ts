import { NextRequest } from 'next/server';

/**
 * Arabic first, whatever the phone's language. next-intl picks the language
 * for an address without one (`www.qauto.store`) from, in order: the language
 * the visitor chose before (its NEXT_LOCALE cookie), the phone's language
 * (Accept-Language), then the default. Removing the phone's language leaves
 * the remembered choice, else Arabic.
 *
 * (next-intl's `localeDetection: false` would ignore the remembered choice too.)
 */
export function withoutPhoneLanguage(request: NextRequest): NextRequest {
  if (!request.headers.has('accept-language')) return request;
  const headers = new Headers(request.headers);
  headers.delete('accept-language');
  return new NextRequest(request, { headers });
}
