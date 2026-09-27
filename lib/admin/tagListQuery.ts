import { TAG_STATUSES, type TagStatus } from '@/lib/domain/constants';
import { toAsciiDigits } from '@/lib/validation/digits';
import { applyCrockfordAliases } from '@/lib/validation/tagId';

/** URL state for /admin/tags. Everything from the query string is untrusted. */
export interface TagListQuery {
  status?: TagStatus;
  /** Raw search text as typed, echoed back into the input. */
  q?: string;
  /** Crockford fragment of the id body, safe to use as an anchored prefix. */
  idPrefix?: string;
  invalidSearch: boolean;
  page: number;
}

export const TRANSITION_RESULTS = ['ok', 'not_allowed', 'conflict', 'not_found', 'deleted', 'cleaned', 'taken_back', 'forbidden'] as const;
/** The results that report something done, shown in green. */
export const TAG_SUCCESS_RESULTS: ReadonlySet<string> = new Set(['ok', 'deleted', 'cleaned', 'taken_back']);
export type TransitionResultCode = (typeof TRANSITION_RESULTS)[number];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** "aut-7k3m", "7K3M 9Q", "AUT7K3M" → "7K3M…" (Crockford only, ≤ 8 chars) or null. */
export function normalizeIdSearch(input: string): string | null {
  let compact = toAsciiDigits(input).toUpperCase().replace(/[\s\-_]/g, '');
  if (compact.startsWith('AUT')) compact = compact.slice(3);
  compact = applyCrockfordAliases(compact);
  return /^[0-9A-HJKMNP-TV-Z]{1,8}$/.test(compact) ? compact : null;
}

export function parseTagListQuery(params: RawParams): TagListQuery {
  const status = first(params.status);
  const q = first(params.q)?.trim().slice(0, 40) || undefined;
  const pageNumber = Number.parseInt(first(params.page) ?? '1', 10);
  const idPrefix = q ? normalizeIdSearch(q) : null;
  return {
    status: (TAG_STATUSES as readonly string[]).includes(status ?? '') ? (status as TagStatus) : undefined,
    q,
    idPrefix: idPrefix ?? undefined,
    invalidSearch: Boolean(q) && !idPrefix,
    page: Number.isFinite(pageNumber) && pageNumber > 0 ? Math.min(pageNumber, 100_000) : 1,
  };
}

export function parseTransitionResult(value: string | string[] | undefined): TransitionResultCode | null {
  const v = first(value);
  return (TRANSITION_RESULTS as readonly string[]).includes(v ?? '') ? (v as TransitionResultCode) : null;
}

/** Query string (with leading "?", or "") for the list, dropping defaults. */
export function tagListSearch(query: Pick<TagListQuery, 'status' | 'q' | 'page'>): string {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.page > 1) params.set('page', String(query.page));
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * Where a status-change form sends the admin back to. Only the known list
 * parameters survive, so a forged `returnTo` can't redirect anywhere else.
 */
export function tagListReturnPath(locale: string, returnSearch: unknown, result: TransitionResultCode): string {
  const raw = typeof returnSearch === 'string' && returnSearch.startsWith('?') ? returnSearch : '';
  const parsed = parseTagListQuery(Object.fromEntries(new URLSearchParams(raw)));
  const search = new URLSearchParams(tagListSearch(parsed).slice(1));
  search.set('result', result);
  return `/${locale}/admin/tags?${search.toString()}`;
}
