import { USER_STATUSES, type UserStatus } from '@/lib/domain/constants';
import { isValidPublicUserId } from '@/lib/validation/publicUserId';
import { normalizeDzPhone } from '@/lib/validation/phone';

/** URL state for /admin/customers. Everything from the query string is untrusted. */
export interface CustomerListQuery {
  status?: UserStatus;
  /** Raw search text as typed, echoed back into the input. */
  q?: string;
  /** What the search resolved to: a phone (exact) or an email fragment. */
  phone?: string;
  email?: string;
  page: number;
  /** The account opened in the detail panel. */
  id?: string;
}

export const CUSTOMER_RESULTS = ['ok', 'not_found', 'not_allowed', 'invalid'] as const;
export type CustomerResultCode = (typeof CUSTOMER_RESULTS)[number];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCustomerListQuery(params: RawParams): CustomerListQuery {
  const status = first(params.status);
  const q = first(params.q)?.trim().slice(0, 60) || undefined;
  const pageNumber = Number.parseInt(first(params.page) ?? '1', 10);
  const id = first(params.id);

  // Digits look like a phone; anything else is matched against the email.
  const phone = q ? normalizeDzPhone(q) : null;

  return {
    status: (USER_STATUSES as readonly string[]).includes(status ?? '') ? (status as UserStatus) : undefined,
    q,
    phone: phone ?? undefined,
    email: q && !phone ? q : undefined,
    page: Number.isFinite(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 100_000) : 1,
    id: isValidPublicUserId(id) ? id : undefined,
  };
}

export function parseCustomerResult(value: string | string[] | undefined): CustomerResultCode | null {
  const v = first(value);
  return (CUSTOMER_RESULTS as readonly string[]).includes(v ?? '') ? (v as CustomerResultCode) : null;
}

/** Query string (with leading "?", or "") for the list, dropping defaults. */
export function customerListSearch(query: Pick<CustomerListQuery, 'status' | 'q' | 'page' | 'id'>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.page > 1) params.set('page', String(query.page));
  if (query.id) params.set('id', query.id);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * Where an admin action sends the admin back to. Only the known list
 * parameters survive, so a forged `returnTo` cannot redirect anywhere else.
 */
export function customerListReturnPath(
  locale: string,
  returnSearch: unknown,
  result: CustomerResultCode,
): string {
  const raw = typeof returnSearch === 'string' && returnSearch.startsWith('?') ? returnSearch : '';
  const parsed = parseCustomerListQuery(Object.fromEntries(new URLSearchParams(raw)));
  const search = new URLSearchParams(customerListSearch(parsed).slice(1));
  search.set('result', result);
  return `/${locale}/admin/customers?${search.toString()}`;
}
