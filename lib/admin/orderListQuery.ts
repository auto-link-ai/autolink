import { ORDER_STATUSES, type OrderStatus } from '@/lib/domain/constants';
import { normalizeOrderRefInput } from '@/lib/orders/ref';
import { normalizeDzPhone } from '@/lib/validation/phone';

/** URL state for /admin/orders. Everything from the query string is untrusted. */
export interface OrderListQuery {
  status?: OrderStatus;
  /** Raw search text as typed, echoed back into the input. */
  q?: string;
  /** Exact reference the search resolved to, if any. */
  orderRef?: string;
  /** Normalized phone the search resolved to, if any. */
  phone?: string;
  invalidSearch: boolean;
  page: number;
  /** The order opened in the detail panel. */
  ref?: string;
}

export const ORDER_RESULTS = [
  'ok',
  'not_found',
  'not_allowed',
  'conflict',
  'tags_missing',
  'wrong_count',
  'unavailable',
  'invalid',
  'created',
  'deleted',
  'no_delivery',
  'forbidden',
] as const;
/** The results that report something done, shown in green. */
export const ORDER_SUCCESS_RESULTS: ReadonlySet<string> = new Set(['ok', 'created', 'deleted']);
export type OrderResultCode = (typeof ORDER_RESULTS)[number];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseOrderListQuery(params: RawParams): OrderListQuery {
  const status = first(params.status);
  const q = first(params.q)?.trim().slice(0, 40) || undefined;
  const pageNumber = Number.parseInt(first(params.page) ?? '1', 10);
  const orderRef = q ? normalizeOrderRefInput(q) : null;
  const phone = q && !orderRef ? normalizeDzPhone(q) : null;
  const ref = first(params.ref);

  return {
    status: (ORDER_STATUSES as readonly string[]).includes(status ?? '') ? (status as OrderStatus) : undefined,
    q,
    orderRef: orderRef ?? undefined,
    phone: phone ?? undefined,
    invalidSearch: Boolean(q) && !orderRef && !phone,
    page: Number.isFinite(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 100_000) : 1,
    ref: ref ? (normalizeOrderRefInput(ref) ?? undefined) : undefined,
  };
}

export function parseOrderResult(value: string | string[] | undefined): OrderResultCode | null {
  const v = first(value);
  return (ORDER_RESULTS as readonly string[]).includes(v ?? '') ? (v as OrderResultCode) : null;
}

/** Query string (with leading "?", or "") for the list, dropping defaults. */
export function orderListSearch(query: Pick<OrderListQuery, 'status' | 'q' | 'page' | 'ref'>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.page > 1) params.set('page', String(query.page));
  if (query.ref) params.set('ref', query.ref);
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * Where an admin action sends the admin back to. Only the known list
 * parameters survive, so a forged `returnTo` cannot redirect anywhere else.
 */
export function orderListReturnPath(locale: string, returnSearch: unknown, result: OrderResultCode): string {
  const raw = typeof returnSearch === 'string' && returnSearch.startsWith('?') ? returnSearch : '';
  const parsed = parseOrderListQuery(Object.fromEntries(new URLSearchParams(raw)));
  const search = new URLSearchParams(orderListSearch(parsed).slice(1));
  search.set('result', result);
  return `/${locale}/admin/orders?${search.toString()}`;
}
