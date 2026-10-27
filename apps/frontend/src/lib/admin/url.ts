import "server-only";

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query parameter. */
export function param(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** One of the allowed values of a query parameter, else the first one. */
export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : allowed[0];
}

/** Page number of a query parameter, from 1. */
export function pageOf(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * `path` with the current query, changed: a null or default value removes
 * the parameter, so that the URLs stay short.
 */
export function hrefWith(path: string, current: Record<string, string | undefined>, changes: Record<string, string | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) query.set(key, value);
  }
  const search = query.toString();
  return search ? `${path}?${search}` : path;
}
